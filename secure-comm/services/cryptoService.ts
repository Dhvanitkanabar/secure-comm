
/**
 * Simple XOR cipher simulation for educational purposes.
 * Real AES would be overkill for a UI-based packet flow visualization,
 * but this provides the exact "unreadable" effect needed for MITM demo.
 */

export const SECRET_KEY = "SECURE_SIM_KEY_2024";

export const encrypt = (text: string): string => {
  // Simple Base64 + key-based obfuscation to represent "Cipher Text"
  const result = text.split('').map((char, i) => {
    const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
    return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
  }).join('');
  return btoa(result);
};

export const decrypt = (cipher: string): string => {
  try {
    const decoded = atob(cipher);
    return decoded.split('').map((char, i) => {
      const keyChar = SECRET_KEY.charCodeAt(i % SECRET_KEY.length);
      return String.fromCharCode(char.charCodeAt(0) ^ keyChar);
    }).join('');
  } catch (e) {
    return "[DECRYPTION_ERROR_INVALID_FORMAT]";
  }
};
