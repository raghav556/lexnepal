/**
 * EICAR antivirus test payload shared by storage/matters verification scripts.
 * The join-split construction keeps real-time antivirus (e.g. Windows Defender)
 * from flagging the source file itself as a threat.
 */
export const EICAR_TEST_FILE_BYTES = new TextEncoder().encode(
  ["X5O!P%@AP[4\\PZX54(P^)", "7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"].join(""),
);
