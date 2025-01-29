from bluetooth_class import ESP32Bluetooth
import time

# Instanciar la clase Bluetooth
ble = ESP32Bluetooth(name="ESP32_Device")


# Simulación de datos que cambian
temperatura = 25.3
humedad = 60.5
estado = "activo"

# Crear el diccionario de datos
    data = {
        "temperatura": temperatura,
        "humedad": humedad,
        "estado": estado
    }

    # Enviar los datos
    ble.send_data(data)
