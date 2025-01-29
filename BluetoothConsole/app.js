// Elementos del DOM
const connectButton = document.getElementById('connectButton');
const dataDisplay = document.getElementById('dataDisplay');

// UUIDs del servicio y característica BLE
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';

// Variable para almacenar la característica BLE
let characteristic;

// Función para conectar al ESP32
connectButton.addEventListener('click', async () => {
    try {
        console.log('Solicitando dispositivo Bluetooth...');
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: 'ESP32' }],
            optionalServices: [SERVICE_UUID]
        });

        console.log('Conectando al dispositivo:', device.name);
        const server = await device.gatt.connect();

        console.log('Obteniendo servicio...');
        const service = await server.getPrimaryService(SERVICE_UUID);

        console.log('Obteniendo característica...');
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        console.log('Iniciando notificaciones...');
        await characteristic.startNotifications();

        characteristic.addEventListener('characteristicvaluechanged', handleData);
        console.log('Listo para recibir datos.');
    } catch (error) {
        console.error('Error:', error);
    }
});

// Función para manejar los datos recibidos
function handleData(event) {
    const value = new TextDecoder().decode(event.target.value);
    console.log('Dato recibido (raw):', value);

    try {
        // Convertir el string recibido a un objeto JSON
        const data = JSON.parse(value);

        // Limpiar el contenedor de datos
        dataDisplay.innerHTML = '';

        // Generar dinámicamente los elementos HTML para cada variable
        for (const [key, value] of Object.entries(data)) {
            const p = document.createElement('p');
            p.innerHTML = `<strong>${key}:</strong> <span>${value}</span>`;
            dataDisplay.appendChild(p);
        }
    } catch (error) {
        console.error('Error al parsear los datos:', error);
        console.error('Dato recibido (raw):', value);
    }
}