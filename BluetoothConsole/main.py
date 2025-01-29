from bluetooth_class import ESP32Bluetooth
import time

# Instanciar la clase Bluetooth
ble = ESP32Bluetooth(name="ESP32_Device")


# Simulación de datos que cambian
temperatura = 25.3
humedad = 60.5
estado = "activo"

while True:
    # Actualizar los datos
    temperatura += 0.1
    humedad -= 0.2

    # Crear el diccionario de datos
    data = {
        "temperatura": temperatura,
        "humedad": humedad,
        "estado": estado
    }

    # Enviar los datos
    ble.send_data(data)

    # Esperar 5 segundos antes de enviar nuevos datos
    time.sleep(5)