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
                if (this.pgn == 0x00DA00 || this.pgn == 0x00DB00) {
                    this.specialType = '(reserved for ISO 15765-2 (ISO TP)';
                } else if (this.pgn == 0x00E800) {
                    this.specialType = 'Acknowledge';
                } else if (this.pgn == 0x00EA00) {
                    this.specialType = 'Request';
                } else if (this.pgn == 0x00EB00) {
                    this.specialType = 'Transport Protocol (Data Transfer)';
                } else if (this.pgn == 0x00EC00) {
                    this.specialType = 'Transport Protocol (Connection Management)';
                } else if (this.pgn == 0x00EE00) {
                    this.specialType = 'Address claimed / cannot claim address';
                } else if (this.pduFormat == 0xEF) {
                    this.specialType = 'Proprietary A';
                } else if (this.pduFormat == 0xFF) {
                    this.specialType = 'Proprietary B';
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
