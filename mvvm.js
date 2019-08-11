class Dep {
  constructor() {
    this.subs= []
  }
  add(watcher) {
    this.subs.push(watcher)
  }
  notify() {
    this.subs.forEach(watcher => {
      log('watcher', watcher)
      watcher.update()
    })
  }
}

class Watcher {
  constructor(vm, expr, cb) {
    this.vm = vm
    this.expr = expr 
    this.cb = cb 
    this.oldValue = this.get()
  }
  get() {
    Dep.target = this
    let value = compileUtil.getValue(this.vm, this.expr)
    Dep.target = null
    return value
  }
  update() {
    let newValue = compileUtil.getValue(this.vm, this.expr)
    if (newValue !== this.oldValue) {
      this.cb(newValue)
    }
  }
}

const log = console.log.bind(console)
const isElementNode = (node) => {
  return node.nodeType === 1
}
const isDirective = (attrName) => {
  return /^v\-/.test(attrName)
}
class Compiler {
  constructor(el, vm) {
    this.el = isElementNode(el) ? el : document.querySelector(el)
    this.vm = vm 
    let fragment = this.node2fragment(this.el)
    this.compile(fragment)
    this.el.appendChild(fragment)
  }
  compile(fragment) {
    let childNodes = fragment.childNodes
    ;[...childNodes].forEach(child => {
      if (isElementNode(child)) {
        this.compileElement(child) 
        this.compile(child)
      } else {
        this.compileText(child)
      }
    })
  }
  compileElement(node) {
    let attributes = node.attributes
    ;[...attributes].forEach(attr => {
      let {name, value: expr} = attr
      if (isDirective(name)) {
        // log(name)
        let [, directive] = name.split('-')
        compileUtil[directive](node, expr, this.vm)
      }
    })
    
  }
  compileText(node) {
    let content = node.textContent
    if (/\{\{(.+?)\}\}/g.test(content)) {
      compileUtil['text'](node, content, this.vm)
    }
  }
  node2fragment(node) {
    let fragment = document.createDocumentFragment()
    while (node.firstChild) {
      fragment.appendChild(node.firstChild)
    }
    return fragment
  }

}
class Observer {
  constructor(data) {
    this.observer(data)
  }
  observer(data) {
    if (data && typeof data === 'object') {
      for (let key in data) {
        this.defineReactive(data, key, data[key])
      }
    }
  }
  defineReactive(obj, key, value) {
    this.observer(value)
    let dep = new Dep()
    Object.defineProperty(obj, key, {
      get() {
        Dep.target && dep.add(Dep.target)
        return value
      },
      set: newValue => {
        if (newValue !== value) {
          this.observer(newValue)
          value = newValue
          dep.notify()
        }
      }
    })
  }
}
var compileUtil = {
  getValue(vm, expr) {
    return expr.split('.').reduce((data, current) => {
      return data[current]
    }, vm.$data)
  },
  model(node, expr, vm) {
    let fn = this.updater['modelUpdater']
    new Watcher(vm, expr, newValue => {
      fn(node, newValue)
    })
    let value = this.getValue(vm, expr)
  },
  updater: {
    modelUpdater(node, value) {
      node.value = value
    },
    htmlUpdater() {
      //
    },
    textUpdater(node, newValue) {
      node.textContent = newValue
    }

  },
  getContentValue(vm, expr) {
    return expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      return this.getValue(vm, args[1])
    })
  },
  text(node, expr, vm) {
    let fn = this.updater['textUpdater']
    let content = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
      new Watcher(vm, args[1], (newValue) => {
        fn(node, this.getContentValue(vm, expr))
      })
      return this.getValue(vm, args[1])
    })
    fn(node, content)
  },
}

class Vue {
  constructor(options) {
    this.$el = options.el 
    this.$data = typeof options.data === 'function' ? options.data() : options.data
    if (this.$el) {
      new Observer(this.$data)
      new Compiler(this.$el, this)
    }
  }

}


