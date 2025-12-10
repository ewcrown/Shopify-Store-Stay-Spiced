function compareStorage() {
    const STORE_NAME = 'compare_products'

    const _load = () => {
        let raw = localStorage.getItem(STORE_NAME)
        if(!raw) {
            localStorage.setItem(STORE_NAME, JSON.stringify([]))
            return []
        }
        try {
            return JSON.parse(raw)
        } catch(e) {
            console.error('Parse error:', e)
            return []
        }
    }

    const _save = (arr) => {
        localStorage.setItem(STORE_NAME, JSON.stringify(arr))
        return arr
    }

    const _isEqualObject = (a, b) => {
        return JSON.stringify(a) === JSON.stringify(b)
    }

    const _add = (obj) => {
        if(typeof obj !== 'object' || !obj.id) {
            throw new Error('Object field is required')
        }
 
        let storage = _load()

        if(storage.length >= 3) {
            throw new Error('Max 3 products')
        }

        const existsExact = storage.some(item => _isEqualObject(item, obj))
        if(existsExact) {
            throw new Error('This object is equil')
        }

        const existsById = storage.some(item => item.id === obj.id)
        if(existsById) {
            throw new Error(`Product ${id} exists`)
        }

        storage.push(obj)
        return _save(storage)
    }

    const _removeById = (id) => {
        let storage = _load()

        const index = storage.findIndex(item => item.id === id)
        if(index > -1) {
            storage.splice(index, 1)
            return _save(storage)
        }
        return storage
    }

    const _clear = () => {
        localStorage.removeItem(STORE_NAME)
    }

    return {
        get store() {
            return _load()
        },
        add: (obj) => _add(obj),
        remove: (id) => _removeById(id),
        clear: () => _clear()
    }
}

export default compareStorage