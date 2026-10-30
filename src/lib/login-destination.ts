// A fixed allowlist keeps the login return path local and protected.
export function loginDestination(value:unknown):'/admin'|'/dashboard'{
  return value==='/dashboard'?'/dashboard':'/admin';
}
