// Record API calls without changing fetch's response or error behavior.
export async function loggedFetch(url, options, recordRequest) {
  const started = performance.now()
  let status = 'ERR'
  try {
    const response = await fetch(url, options)
    status = response.status
    return response
  } finally {
    recordRequest({
      status,
      timestamp: new Date().toISOString(),
      method: (options?.method || 'GET').toUpperCase(),
      // Show the API path independently of the gateway's function prefix.
      path: url.slice(url.indexOf('/api/')),
      duration: Math.round(performance.now() - started),
    })
  }
}
