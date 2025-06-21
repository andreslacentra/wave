// app.js - Versión Final

// --- Elementos del DOM ---
const connectButton = document.getElementById('connectButton');
const dataDisplay = document.getElementById('dataDisplay');
const configForm = document.getElementById('configForm');
const saveButton = document.getElementById('saveButton');
const statusMessage = document.getElementById('statusMessage');

// --- UUIDs del Servicio y Característica BLE ---
// Se usa el Nordic UART Service, que es un estándar de facto para comunicación serie por BLE.
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
// La misma característica se usará para Escribir (enviar config) y Notificar (recibir estado).
const CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

// --- Variables Globales ---
let bleDevice;
let bleCharacteristic;

// --- Funciones Auxiliares ---

/**
 * Muestra un mensaje de estado al usuario en la interfaz.
 * @param {string} message - El mensaje a mostrar.
 * @param {boolean} isError - Si es true, se mostrará con estilo de error.
 */
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${isError ? 'status-error' : 'status-success'}`;
    statusMessage.style.display = 'block';
    // Ocultar el mensaje después de 5 segundos
    setTimeout(() => { statusMessage.style.display = 'none'; }, 5000);
}

/**
 * Maneja los datos de notificación recibidos del ESP32.
 * @param {Event} event - El evento 'characteristicvaluechanged'.
 */
function handleData(event) {
    const value = new TextDecoder().decode(event.target.value);
    try {
        const data = JSON.parse(value);
        dataDisplay.innerHTML = '';
        for (const [key, val] of Object.entries(data)) {
            const p = document.createElement('p');
            // Muestra N/A si el valor es null o undefined, de lo contrario muestra el valor.
            p.innerHTML = `<strong>${key}:</strong> <span>${val != null ? val : 'N/A'}</span>`;
            dataDisplay.appendChild(p);
        }
    } catch (error) {
        console.error('Error al parsear los datos JSON recibidos:', error);
    }
}

/**
 * Envía un string largo al dispositivo BLE, dividiéndolo en trozos de 20 bytes.
 * @param {string} dataString - El string completo a enviar.
 */
async function sendDataInChunks(dataString) {
    if (!bleCharacteristic) {
        showStatus('No hay característica BLE para escribir.', true);
        return;
    }

    const chunkSize = 20; // Tamaño máximo del paquete de datos útiles en BLE estándar.
    const encoder = new TextEncoder();

    // Itera sobre el string y envía trozo por trozo.
    for (let i = 0; i < dataString.length; i += chunkSize) {
        const chunk = dataString.slice(i, i + chunkSize);
        const encodedChunk = encoder.encode(chunk);
        
        try {
            console.log(`Enviando chunk: ${chunk}`);
            // Se usa writeValueWithoutResponse para un "streaming" más rápido.
            await bleCharacteristic.writeValueWithoutResponse(encodedChunk);
            // Pausa CRÍTICA para permitir que el receptor procese el paquete.
            await new Promise(resolve => setTimeout(resolve, 50)); 
        } catch (error) {
            console.error(`Error enviando chunk: ${chunk}`, error);
            showStatus('Error al enviar un paquete de datos. Intente de nuevo.', true);
            return; // Detener el envío si un chunk falla.
        }
    }
    console.log('Todos los chunks enviados con éxito.');
}

// --- Lógica Principal y Event Listeners ---

// Evento para el botón de Conectar
connectButton.addEventListener('click', async () => {
    try {
        console.log('Solicitando dispositivo Bluetooth...');
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'ESP32' }], // Busca dispositivos cuyo nombre empiece con "ESP32"
            optionalServices: [SERVICE_UUID]
        });

        console.log('Conectando al dispositivo:', bleDevice.name);
        const server = await bleDevice.gatt.connect();

        console.log('Obteniendo servicio...');
        const service = await server.getPrimaryService(SERVICE_UUID);

        console.log('Obteniendo característica...');
        bleCharacteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        console.log('Iniciando notificaciones...');
        await bleCharacteristic.startNotifications();
        bleCharacteristic.addEventListener('characteristicvaluechanged', handleData);

        console.log('Conexión y configuración BLE completadas.');
        connectButton.textContent = `Conectado a ${bleDevice.name}`;
        connectButton.disabled = true;
        configForm.disabled = false; // Habilitar el formulario de configuración.

    } catch (error) {
        console.error('Error de conexión BLE:', error);
        showStatus('Error al conectar con el dispositivo. Verifique que esté encendido y cerca.', true);
    }
});

// Evento para el botón de Guardar Configuración
saveButton.addEventListener('click', async () => {
    if (!bleCharacteristic) {
        showStatus('No hay conexión para enviar datos.', true);
        return;
    }

    // 1. Recoger los datos del formulario.
    const newConfig = {
        ssid_primary: document.getElementById('ssid_primary').value,
        pass_primary: document.getElementById('pass_primary').value,
        ssid_secondary: document.getElementById('ssid_secondary').value,
        pass_secondary: document.getElementById('pass_secondary').value,
        device_tag_value: document.getElementById('device_tag_value').value
    };
    
    // 2. Filtrar campos vacíos para no enviar strings vacíos innecesariamente.
    const configToSend = {};
    for (const [key, value] of Object.entries(newConfig)) {
        if (value) {
            configToSend[key] = value;
        }
    }

    if (Object.keys(configToSend).length === 0) {
        showStatus('No hay nuevos datos de configuración para enviar.', true);
        return;
    }
    
    // 3. Convertir a JSON y añadir el carácter de fin de transmisión (\n).
    const jsonString = JSON.stringify(configToSend) + '\n';
    
    // 4. Enviar los datos usando la función de fragmentación.
    await sendDataInChunks(jsonString);
    
    showStatus('Configuración enviada. El ESP32 se reiniciará para aplicar los cambios.');
});
