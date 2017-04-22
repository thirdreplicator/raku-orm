
const assoc_in = (m, ks, v) => {
  if (m == undefined) { m = {} }
  if (m.constructor.name != 'Object' || ks.constructor.name != 'Array') {
    throw('assoc_in takes 3 arguments (m, ks, v). m is a map.  ks is an array of keys. v is the new value.')
  }
	// deep clone the plain object.
  let m_ = JSON.parse(JSON.stringify(m))

  if (ks.length == 0) {
    return m_
  } else if (ks.length == 1) {
		let k = ks[0]
		m_[k] = v
    return m_
  } else if (ks.length >= 2) {
    let k = ks[0]
    m_[k] = assoc_in(m_[k], ks.slice(1), v)
    return m_
  }
}

const update_in = (m, ks, fn, ...args) => {
  const doc_string = 'update_in takes 3 arguments (m, ks, fn [, args]). m is a map.  ks is an array of keys. fn is a function that takes the current value and returns the new value.  args are additional args for fn.'
  if (m == undefined) { m = {} }
  if (!m || m.constructor.name != 'Object' ) { throw 'The first argument of update_in must be a Javascript plain object. ' + doc_string }
  if (!ks || ks.constructor.name != 'Array') { throw 'The second argument of update_in must be an Array.' + doc_string }
  if (!fn || fn.constructor.name != 'Function') { throw 'The 3rd argument of update_in must be a function.' + doc_string }
	// deep clone the plain object.
  let m_ = JSON.parse(JSON.stringify(m))
  if (ks.length == 0) {
    return m_
  } else if (ks.length == 1) {
		let k = ks[0]
		m_[k] = fn(m_[k])
    return m_
  } else if (ks.length >= 2) {
    let k = ks[0]
    m_[k] = update_in(m_[k], ks.slice(1), fn)
    return m_
  }
}

export { assoc_in, update_in }
