'use strict'

const RELEASE_TAG_RX = /^v?(\d+)\.(\d+)\.(\d+)$/

const parseRelease = (refname) => {
  const match = RELEASE_TAG_RX.exec(refname)
  return match?.slice(1).map(Number)
}

// 0.x minors can break each other, so they each count as a major line.
const lineOf = ([major, minor]) => (major > 0 ? `${major}` : `0.${minor}`)

const isNewer = (a, b) => {
  const i = a.findIndex((part, idx) => part !== b[idx])
  return i !== -1 && a[i] > b[i]
}

const reftypeOf = (bundle) => bundle.origins[0].reftype

const asNext = (bundle) =>
  Object.assign(bundle, { version: 'next', displayVersion: 'Next', prerelease: true })

const asRelease = (bundle, line) =>
  Object.assign(bundle, { version: `${line}.x`, displayVersion: `${line}.x`, prerelease: undefined })

const releaseOf = (bundle) => {
  const parts = reftypeOf(bundle) === 'tag' ? parseRelease(bundle.origins[0].refname) : undefined
  return parts ? { bundle, parts, key: `${bundle.name}@${lineOf(parts)}` } : undefined
}

const newestPerLine = (releases) =>
  releases.reduce((newest, release) => {
    const current = newest.get(release.key)
    return !current || isNewer(release.parts, current.parts) ? newest.set(release.key, release) : newest
  }, new Map())

/**
 * Publishes the newest `X.Y.Z` tag of each major line (each minor line below
 * 1.0) as `<line>.x` and every branch as the prerelease `next`. Drops all
 * other tags. Config: `unversioned`, component names to leave untouched.
 */
function register({ config: { unversioned = [] } }) {
  this.on('contentAggregated', ({ contentAggregate }) => {
    const versioned = contentAggregate.filter((bundle) => !unversioned.includes(bundle.name))
    const releases = newestPerLine(versioned.map(releaseOf).filter(Boolean))
    const kept = new Set([...releases.values()].map(({ bundle }) => bundle))
    versioned.filter((bundle) => reftypeOf(bundle) === 'branch').forEach(asNext)
    releases.forEach(({ bundle, parts }) => asRelease(bundle, lineOf(parts)))
    const dropped = new Set(versioned.filter((bundle) => reftypeOf(bundle) === 'tag' && !kept.has(bundle)))
    contentAggregate.splice(0, contentAggregate.length, ...contentAggregate.filter((b) => !dropped.has(b)))
  })
}

module.exports = { register }
