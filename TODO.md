# TO-DO List

## Bugs

| Priority | Description | Status |
|----------|-------------|--------|
| High | Decryption and Protobuf decoding are not working properly | ✅ Complete - Fixed encryption algorithm, nonce handling, and key management |
| High | Services locking up and requiring restart | 🔧 In Progress - Debug tools created, resource limits added |
| Medium | Network topology graph link is not working, it takes the user to the map | Complete |
| Medium | Map center on user is not working | ✅ Complete - Fixed MUI Tooltip warning |
| Medium | Map startup on user location not working | Non-Issue |
| Low | Hardware types are not complete and may even be wrong | Complete |
| Medium | Device Telemetry do not appear to be saving | 🔧 Fixed - Added enhanced logging, needs testing |
| Medium | Device Neighbors not being recorded | 🔧 Fixed - Added NeighborInfo parsing and storage, needs testing |
| Low | Hardware names are not being proeprly shown on small node details window | Fixed |
| Low | Hardware names are not being properly shown on large node details window in overview and details tabs | Fixed |
| Low | In Node detail window on the Lora Config tab, There is a blue box at the bottom that is off the window | Not Started |
| Medium | Cluster count icons are not working correctly when you click on them or zoom in on the map | Not Started |

## Incomplete Features

| Priority | Description | Status |
|----------|-------------|--------|
| High | Docker deployment not complete | Not Started |
| Medium | MQTT monitor statistics has issues like rounding, no numbers in messages by type and top nodes are showing the decimal value | ✅ Complete - Fixed decryption failures count and messages per minute calculation |

## Changes

| Priority | Description | Status |
|----------|-------------|--------|
| Low | About window needs restructured to represent the application and move about meshtastic down below the about for the application, it should link to the github repo for the application. The system information at the bottom is not properly represented. | ✅ Complete |
| Medium | Make node icons and cluster icons larger | Not Started |
| Low | Add option to map options to show node name on map | Not Started |

## New Features

| Priority | Description | Status |
|----------|-------------|--------|
| Low | MOTD is in config but not anywhere else | ✅ Complete |
| Low | Add ability to change name of site and logo in the config file | ✅ Complete (name only) |
| Low | Add copyright to bottom of pages | ✅ Complete |
