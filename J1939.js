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
            inputString: '18DAF131',

            canId: 0,
            sourceAddress: 0,
            pduSpecific: 0,
            pduFormat: 0,
            dataPage: 0,
            reserved: 0,
            priority: 0,

            communicationMode: '',
            destinationSpecific: false,
            destinationAddress: null,
            pgn: 0,
            proprietary: false,
            isValid: false,
            errorMessage: 'starting up',
        };
    },
    methods: {
        formatHex(value, length = 2) {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                return '';
            }
            return intToHexString(value, length);
        },
        formatDec(value) {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                return '';
            }
            return value;
        },
        update(inputType, inputString) {
            this.isValid = false;
            this.errorMessage = 'Unknown error';

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
                this.proprietary = this.pduFormat == 0xEF || this.pduFormat == 0xFF;
                this.request = this.pgn == 0x00EA00;
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
