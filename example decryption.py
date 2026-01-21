if mp.HasField("encrypted") and not mp.HasField("decoded"):
                    is_encrypted = True
                    for key_item in self.config['broker']['channels']['encryption']:
                        key_bytes = base64.b64decode(key_item['key'].encode('ascii'))
                        try:
                            if self.config['debug']:
                                print(f"Attempting decryption with key: {key}")
                            nonce_packet_id = getattr(mp, "id").to_bytes(8, "little")
                            nonce_from_node = getattr(mp, "from").to_bytes(8, "little")
                            nonce = nonce_packet_id + nonce_from_node
                            cipher = Cipher(algorithms.AES(key_bytes), modes.CTR(nonce), backend=default_backend())
                            decryptor = cipher.decryptor()
                            decrypted_bytes = decryptor.update(getattr(mp, "encrypted")) + decryptor.finalize()
                            data = mesh_pb2.Data()
                            data.ParseFromString(decrypted_bytes)
                            mp.decoded.CopyFrom(data)
                            outs = json.loads(MessageToJson(mp, preserving_proto_field_name=True, ensure_ascii=False, indent=2, sort_keys=True, use_integers_for_enums=True))
                            break
                        except Exception as e:
                            if self.config['debug']:
                                print(f"*** Decryption failed: {str(e)}")
                            continue





default_key = "1PG7OiApB1nwvP+rz05pAQ==" # AKA AQ==

# Replace with your encryption key (if using encryption)
ENCRYPTION_KEY = b'your_encryption_key'  # 32-byte key (e.g., generated with Fernet.generate_key())


def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"CONNECTED")
        client.subscribe(MQTT_TOPIC)

def decode_encrypted(mp):
    try:
        kb = base64.b64decode(default_key.encode("ascii"))
        nonce_packet_id = getattr(mp, "id").to_bytes(8, "little")
        nonce_from_node = getattr(mp, "from").to_bytes(8, "little")
        nonce = nonce_packet_id + nonce_from_node

        cipher = Cipher(algorithms.AES(kb), modes.CTR(nonce), backend=default_backend())
        decryptor = cipher.decryptor()
        db = decryptor.update(getattr(mp, "encrypted")) + decryptor.finalize()
        data = mesh_pb2.Data()
        data.ParseFromString(db)
        mp.decoded.CopyFrom(data)
    except Exception as e:
        print(f"DECRYPT FAILURE: {e}")