import ubluetooth
import ujson
from micropython import const

# Constantes para BLE
_IRQ_CENTRAL_CONNECT = const(1)
_IRQ_CENTRAL_DISCONNECT = const(2)
_IRQ_GATTS_WRITE = const(3)

# UUID del servicio y característica
_SERVICE_UUID = ubluetooth.UUID("6E400001-B5A3-F393-E0A9-E50E24DCCA9E")
_CHAR_UUID = ubluetooth.UUID("6E400002-B5A3-F393-E0A9-E50E24DCCA9E")

class ESP32Bluetooth:
    def __init__(self, name="ESP32"):
        self._ble = ubluetooth.BLE()
        self._ble.active(True)
        self._ble.irq(self._irq)
        self._connections = set()
        self._payload = None

        # Definir el servicio y la característica
        service = (
            _SERVICE_UUID,
            (
                (_CHAR_UUID, ubluetooth.FLAG_READ | ubluetooth.FLAG_WRITE | ubluetooth.FLAG_NOTIFY),
            ),
        )

        # Registrar el servicio
        self._services = self._ble.gatts_register_services([service])
        self._characteristic = self._services[0][0]

        # Configurar la publicidad
        self._advertise(name)

    def _irq(self, event, data):
        if event == _IRQ_CENTRAL_CONNECT:
            conn_handle, _, _ = data
            self._connections.add(conn_handle)
            print("Dispositivo conectado")
        elif event == _IRQ_CENTRAL_DISCONNECT:
            conn_handle, _, _ = data
            self._connections.remove(conn_handle)
            print("Dispositivo desconectado")
            # Reiniciar la publicidad
            self._advertise()
        elif event == _IRQ_GATTS_WRITE:
            conn_handle, value_handle = data
            value = self._ble.gatts_read(value_handle)
            print(f"Dato recibido: {value}")

    def _advertise(self, name="ESP32"):
        # Configurar la publicidad
        self._ble.gap_advertise(100, bytearray(b'\x02\x01\x06') + bytearray((len(name) + 1, 0x09)) + name.encode())

    def send_data(self, data):
        # Convertir el diccionario a un formato enviable (JSON)
        if isinstance(data, dict):
            payload = ujson.dumps(data).encode()  # Convertir a JSON y luego a bytes
        else:
            raise ValueError("El dato debe ser un diccionario")

        # Enviar los datos a través de BLE
        for conn_handle in self._connections:
            self._ble.gatts_notify(conn_handle, self._characteristic, payload)
            print(f"Dato enviado: {payload}")