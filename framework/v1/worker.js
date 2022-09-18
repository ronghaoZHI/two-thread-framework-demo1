// todo: vue mvvm双向绑定, rerender 逻辑 引进来

export default function wk() {
   /* 引入 libs 脚本 */
  importScripts(
    'http://127.0.0.1:8080/compiler-core.global.js', 
    'http://127.0.0.1:8080/runtime-core.global.js',
  );

  initVNodeCompiler()

  let webviewInit = false;
  let vm;
  
  // 模拟初始化页面，以 vue sfc 为例: 
  const initVuePage = {
    data() {
      return { 
        num: 1
      }
    },
    methods: {
      count() {
        this.num++
      }
    },
    template: `<section><button onClick="count">+1</button><p>{{ num }}</p></section>`
  };

  // 事件中心， 方便 webview 与 worker 之间事件通信管理(只考虑了click event)
  let eventCenter = new Map()

  // 注册监听 渲染线程发送的消息 (充当 bridge 通信层)
  self.onmessage = function(event) {
    const { type = '', data = {} } = event.data;

    self.postMessage({
      type: '[woker-receive-log]',
      data: { msg: JSON.stringify(data) }
    })

    if(type === 'init') {
      // ui 进程初始化完成
      webviewInit = true
      // 初始化
      initMainPage()
    }

    //  dom click 事件触发, 进而触发 vm 响应，引起 vnode 变化操作
    if(type === 'click') {
      let nodeId;
      if(nodeId = data.nodeId) {
        // 执行业务逻辑
        const fns = eventCenter.get(nodeId);
        fns.forEach(f => f())
      }
    }

    // other ...
    if(type === 'xxx') { }
  }

  // 初始化 vnode => 通知 ui 渲染 

  // ui 进程 click 事件触发 => 引起 vnode 变化 => 通知 ui 变化渲染

  
  // let hasMount = false;
  const prefix = 'xz-'
  let elId = 0;
  const getElId = () => prefix + elId++;

  function initMainPage() {
    const VueRuntimeCore = self.VueRuntimeCore

    // 初始化 app instance
    const nodeOpsCmd = {
      insert: function(child, parent, anchor = null) {
        // console.log('insert', child, parent, anchor)
        // parent.insertBefore(child, anchor || null)
        self.postMessage({ 
          type: 'nodeOps-insertBefore',
          data: { child: child, parent: parent, anchor }
        })
        // 维护 vnode parent 关系
        const i = parent.children.indexOf(child)
        parent.children.splice(i, 0, child)
        parent.children.forEach(v => (v.parentNode = parent))
        return parent
      },
      remove: function(child) {
        // console.log('remove', child)
        const parent = child.parentNode
        const i = parent.children.indexOf(child)
        parent.children.splice(i, 1)
        // if (parent) {
        //   parent.removeChild(child)
        // }
        self.postMessage({ type: 'nodeOps-remove', data: { child: child.nodeId } }) 
      },
      createElement: function(tag, isSVG, is, props) {
        // todo: event Map 维护 vm-instance ~ ctx.methods
        // let uid = uid;
        // console.log('createElement', tag, isSVG, is, props)
        // console.log('getCurrentInstance().uid', this)
        const el = {
          // instanceId: '',
          nodeId: getElId(),
          parentNode: null,
          children: [],
          tag,
          is: is ? { is } : undefined,
          props,
        }
        self.postMessage({ type: 'nodeOps-createElement', data: el })
        return el
      },
      createText: function(text) {
        // const ctx = this; 
        // console.log('createText', text)
        const el = {
          // instanceId: '',
          nodeId: getElId(),
          parentNode: null,
          tag: 'text',
          text,
        }
        // doc.createTextNode(text)
        self.postMessage({ type: 'nodeOps-createText', data: el })
        return el
      },
      createComment: function(text) {
        // console.log('createComment', text)
        // doc.createComment(text)
        // self.postMessage({ type: 'nodeOps-createComment', data: {args} }) 
      },
      setText: function(el, text) {
        // console.log('setText', el, text)
        // el.textContent = text
        self.postMessage({ type: 'nodeOps-setText', data: { el, text } }) 
      },
      setElementText: function(el, text) { 
        // console.log('setElementText', el, text)
        // el.textContent = text
        self.postMessage({
          type: 'nodeOps-setElementText', 
          data: { el: { nodeId: el.nodeId }, text }
        })
        return el
      },
      setScopeId: function(el, id) { 
        // console.log('setScopeId', el, id)
        // el.setAttribute(id, '')
        // self.postMessage({ type: 'nodeOps-setScopeId', data: {} }) 
        !el.attr && (el.attr = {}) 
        el.attr[id] = ''
        return el
      },
      parentNode: function(node) { 
        // console.log('parentNode', node, node.parentNode)
        // self.postMessage({ type: 'nodeOps-parentNode', data: {} }) 
        return node.parentNode
      },
      nextSibling: function(node) {
        // console.log('nextSibling', node)
        // self.postMessage({ type: 'nodeOps-nextSibling', data: { } })
        const children = node.parentNode.children;
        const nextSibling = children[children.indexOf(node) + 1];

        return nextSibling
      },
      patchProp: function(
        el,
        key,
        prevValue,
        nextValue,
        isSVG = false,
        prevChildren,
        parentComponent,
        parentSuspense,
      ) {
        // Todo: [ class  style  attrs  props  events ] 属性处理
        // console.log('patchProp', {
        //   el,
        //   key,
        //   prevValue,
        //   nextValue,
        //   isSVG,
        //   prevChildren,
        //   parentComponent,
        //   parentSuspense,
        // })  

        // event 处理
        if(/^on.*/.test(key)) {
          patchEvent(el, key, prevValue, nextValue, parentComponent)
        }
      },
      // insertStaticContent: function(...args) { self.postMessage({ type: 'nodeOps-insertStaticContent', data: {args} }) }
      // cloneNode: function(el) {
      //   console.log('cloneNode', el)
      //   // const cloned = el.cloneNode(true)
      //   // self.postMessage({ type: 'nodeOps-cloneNode', data: {} });
      //   const _el = { ...el };
      //   return _el;
      // },
    }

    function patchEvent(el, key, prevValue, nextValue, instance) {
      // console.log('patchEvent', el, key, prevValue, nextValue, instance)
      el = el.nodeId
      key = key.slice(2).toLowerCase();
      //
      eventCenter.set(el, [
        () => {
          try {
            instance.ctx[nextValue](prevValue);
          } catch (error) { console.error(error) }
        }
      ]);

      // 
      self.postMessage({
        type: 'add-event',
        data: {
          nodeId: el,
          events: [key],
          mode: ''
        }
      })
    }

    const rootVnode = { nodeId: getElId(), root: true, children: [], parentNode: null }

    vm = VueRuntimeCore
      .createRenderer(nodeOpsCmd)
      .createApp(initVuePage)
      .mount(rootVnode);

    console.log('vm', vm)
    // // mock vm trigger
    // setTimeout(() => {
    //   console.log('2000')
    //   vm.count()
    // }, 2000)
  }

  function initVNodeCompiler() {
    const compileCache = Object.create(null)

    function compileToFunction(
      template,
      options
    ) {
      if (typeof template !== 'string') {
        console.warn(`invalid template option: `, template)
        return () => {}
      }

      const key = template
      const cached = compileCache[key]
      if (cached) {
        return cached
      }

      // const { code } = self.VueCompilerDOM.compile(
      //   template,
      //   Object.assign({
      //       hoistStatic: false,
      //       onError: console.error,
      //       onWarn: e => console.error(e)
      //     },
      //     options
      //   )
      // )

      const { code } = self.VueCompilerCore.baseCompile(
        template,
        Object.assign({
            hoistStatic: false,
            onError: console.error,
            onWarn: e => console.error(e)
          },
          options
        )
      )

      // The wildcard import results in a huge object with every export
      // with keys that cannot be mangled, and can be quite heavy size-wise.
      // In the global build we know `Vue` is available globally so we can avoid
      // the wildcard object.
      // console.log(code)
      const render = new Function('Vue', code)(VueRuntimeCore);

      // mark the function as runtime compiled
      render._rc = true
      console.log(render)
      return (compileCache[key] = render)
    }

    self.VueRuntimeCore.registerRuntimeCompiler(compileToFunction)
  }
}
