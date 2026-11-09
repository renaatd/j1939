"use strict";

const { createApp } = Vue;

function intToHexString(value, length) {
    let hexString = value.toString(16).toUpperCase();
    while (hexString.length < length) {
        hexString = '0' + hexString;
    }
    return hexString;
}

createApp({
    data() {
        return {
            inputType: 'hex',
            inputString: '18FF1234',

            // CAN ID + components
            canId: 0,
            sourceAddress: 0,
            pduSpecific: 0,
            pduFormat: 0,
            dataPage: 0,
            reserved: 0,
            priority: 0,

            // Derived values
            communicationMode: '',
            destinationSpecific: false,
            destinationAddress: null,
            pgn: 0,
            specialType: '',

            isValid: false,
            errorMessage: 'starting up',
        };
    },
    methods: {
        formatHex(value, length = 2) {
            if (this.isValid === false) {
                return '';
            }
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                return '';
            }
            return '0x' + intToHexString(value, length);
        },
        formatDec(value) {
            if (this.isValid === false) {
                return '';
            }
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                return '';
            }
            return value;
        },
        update(inputType, inputString) {
            this.isValid = false;
            this.errorMessage = 'Unknown error';

            // numbers are automatically hidden when invalid, so we don't need to clear them. Strings must be cleared manually.
            this.communicationMode = '';
            this.specialType = '';

            const trimmed = inputString.replace(/\s/g, '');

            try {
                if (inputType === 'hex') {
                    if (/[^a-fA-F0-9]/.test(trimmed)) {
                        throw new Error('A hexadecimal CAN ID can only contain 0-9 A-F');
                    }
                    this.canId = parseInt(trimmed, 16);
                    if (Number.isNaN(this.canId)) {
                        throw new Error('Invalid hexadecimal number');
                    }
                } else if (inputType === 'dec') {
                    if (/[^0-9]/.test(trimmed)) {
                        throw new Error('A decimal CAN ID can only contain 0-9');
                    }
                    this.canId = parseInt(trimmed, 10);
                    if (Number.isNaN(this.canId)) {
                        throw new Error('Invalid decimal number');
                    }
                } else {
                    throw new Error('Unknown input type: ' + inputType);
                }

                if (this.canId < 0 || this.canId > 0x1FFFFFFF) {
                    throw new Error('CAN ID must be between 0 and 0x1FFFFFFF');
                }

                this.sourceAddress = this.canId & 0xFF;
                this.pduSpecific = (this.canId >> 8) & 0xFF;
                this.pduFormat = (this.canId >> 16) & 0xFF;
                this.dataPage = (this.canId >> 24) & 0x1;
                this.reserved = (this.canId >> 25) & 0x1;
                this.priority = (this.canId >> 26) & 0x7;

                this.destinationSpecific = this.pduFormat < 240;
                this.communicationMode = this.destinationSpecific ? 'PDU1 (Direct)' : 'PDU2 (Broadcast)';
                this.destinationAddress = this.destinationSpecific ? this.pduSpecific : null;
                this.pgn = (this.canId >> 8) & 0x3FFFF;
                if (this.destinationSpecific) {
                    this.pgn &= 0x3FF00;
                }
                this.specialType = '';

                const pgnTable = {
                    0x00C900: 'RQST2 Request2',
                    0x00CA00: 'XFER Transfer',
                    0x00DA00: 'used for ISO 15765-2 (ISO TP)',
                    0x00DB00: 'used for ISO 15765-2 (ISO TP)',
                    0x00E800: 'ACKM Acknowledgment Message',
                    0x00EA00: 'RQST Request',
                    0x00EB00: 'TP.DT Transport Protocol (Data Transfer)',
                    0x00EC00: 'TP.CM Transport Protocol (Connection Management)',
                    0x00EE00: 'AC Address claimed / cannot claim address',
                    0x00EF00: 'PropA Proprietary A',
                    0x00FECA: 'DM1 (active diagnostic trouble codes)',
                    0x00FECB: 'DM2 (previously active diagnostic trouble codes)',
                    0x00FECC: 'DM3 (clear diagnostic data)',
                    0x00FEE6: 'DT time/date',
                    0x00FEEC: 'VI vehicle identification',
                    0x01EF00: 'PropA2 Proprietary A2',
                };
                if (pgnTable.hasOwnProperty(this.pgn)) {
                    this.specialType = pgnTable[this.pgn];
                } else if (this.pgn >= 0x00FF00 && this.pgn <= 0x00FFFF) {
                    this.specialType = 'PropB Proprietary B';
                } else if (this.pgn >= 0x01FF00 && this.pgn <= 0x01FFFF) {
                    this.specialType = 'PropB2 Proprietary B2 (non-official)';
                }
                this.isValid = true;
            } catch (error) {
                if (error instanceof Error) {
                    this.errorMessage = error.message;
                }
            }
        }
    },
    watch: {
        inputString: {
            handler(newValue) {
                this.update(this.inputType, newValue);
            },
            immediate: true
        },
        inputType(newValue) {
            this.update(newValue, this.inputString);
        }
    }
}).mount('#app');
