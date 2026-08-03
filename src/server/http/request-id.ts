import "server-only";
import { REQUEST_ID_HEADER } from "@/shared/constants/application";

const validRequestId = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveRequestId(headers: Headers): string {
  const supplied = headers.get(REQUEST_ID_HEADER);
  return supplied && validRequestId.test(supplied) ? supplied : crypto.randomUUID();
}
