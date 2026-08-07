(() => {
  const root = globalThis
  if (root.__NEXUSCLAW_WALLET_NETWORK_SMOKE__) return

  const observations = []
  const restorers = []

  function targetValue(input) {
    if (typeof input === 'string') return input
    if (input && typeof input.url === 'string') return input.url
    return String(input ?? '')
  }

  function isForbiddenTarget(input) {
    try {
      const url = new URL(targetValue(input), root.location?.href)
      const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
      return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === 'county-hunter.nexusclaw.test' ||
        hostname.split('.').includes('staging')
      )
    } catch {
      return false
    }
  }

  function observe(transport, target) {
    observations.push({
      transport,
      forbidden: isForbiddenTarget(target),
    })
  }

  if (typeof root.fetch === 'function') {
    const original = root.fetch
    root.fetch = function monitoredFetch(input, init) {
      observe('fetch', input)
      return original.call(this, input, init)
    }
    restorers.push(() => { root.fetch = original })
  }

  if (root.XMLHttpRequest?.prototype?.open) {
    const original = root.XMLHttpRequest.prototype.open
    root.XMLHttpRequest.prototype.open = function monitoredOpen(method, url, ...rest) {
      observe('xmlhttprequest', url)
      return original.call(this, method, url, ...rest)
    }
    restorers.push(() => { root.XMLHttpRequest.prototype.open = original })
  }

  for (const [name, transport] of [
    ['WebSocket', 'websocket'],
    ['EventSource', 'eventsource'],
  ]) {
    const Original = root[name]
    if (typeof Original !== 'function') continue
    const Monitored = function monitoredNetworkConstructor(...args) {
      observe(transport, args[0])
      return Reflect.construct(Original, args, new.target || Original)
    }
    Object.setPrototypeOf(Monitored, Original)
    Monitored.prototype = Original.prototype
    root[name] = Monitored
    restorers.push(() => { root[name] = Original })
  }

  if (typeof root.navigator?.sendBeacon === 'function') {
    const original = root.navigator.sendBeacon
    root.navigator.sendBeacon = function monitoredBeacon(url, data) {
      observe('sendbeacon', url)
      return original.call(this, url, data)
    }
    restorers.push(() => { root.navigator.sendBeacon = original })
  }

  if (typeof root.open === 'function') {
    const original = root.open
    root.open = function monitoredWindowOpen(url, ...rest) {
      observe('window.open', url)
      return original.call(this, url, ...rest)
    }
    restorers.push(() => { root.open = original })
  }

  function snapshot() {
    const byTransport = {}
    for (const observation of observations) {
      byTransport[observation.transport] =
        (byTransport[observation.transport] || 0) + 1
    }
    const forbiddenRequests = observations.filter(
      (observation) => observation.forbidden,
    ).length
    return {
      passed: forbiddenRequests === 0,
      observationCount: observations.length,
      forbiddenRequests,
      byTransport,
    }
  }

  root.__NEXUSCLAW_WALLET_NETWORK_SMOKE__ = {
    snapshot,
    finish() {
      const report = snapshot()
      while (restorers.length) restorers.pop()()
      delete root.__NEXUSCLAW_WALLET_NETWORK_SMOKE__
      return report
    },
  }
})()
