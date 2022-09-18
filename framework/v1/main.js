
// 
console.log('v1-main')

import wkjs from './worker';
// console.dir(`${s}`)
// 初始化 worker 进程
let workerThread;

// const uidPrefix = 'xz-vnode-';
// const uidName = `${uidPrefix}uid`;
// let  workerThread = initWorker(wkjs);

function initWorker(wkjs) {
  // debugger
  const workerUrl = URL.createObjectURL(
    new Blob([`(${wkjs})()`], 
    { type: 'application/javascript' })
  );
  const worker = new Worker(workerUrl)
  // worker.meta = { id: uuid(), worker }
  return worker
}

export default function main() {
  workerThread = initWorker(wkjs);
  init(workerThread);
}

function init(worker) {
  // 通知 worker 线程 渲染现场初始化完成
  worker.postMessage({
    type: 'init',
    data: { msg: '渲染线程初始化' }
  })

  // const fragment = document.createDocumentFragment();
  const fragment = document.querySelector('#app')

  // 监听 worker 线程消息
  worker.onmessage = function(event) {
    let { type = '', data = {} } = event.data;
    console.log('[from worker message]:', type, data);
    try {
      data = JSON.parse(data)
    } catch (error) {}

    switch (type) {
      case 'init': 
        // 通知 webview 主进程, woker 进程初始化成功
        console.log('[worker init]', '发送给 woker 线程 webview 初始化成功')
        break;
      case '[woker-receive-log]': 
        break
      case 'nodeOps-createElement': 
        // "nodeId":"xz-1","parentNode":null,"children":[],"tag":"section","props":null
        {
          const { nodeId, tag, text } = data;
          const ele = createEleDom(tag, text, nodeId);
          fragment.appendChild(ele);
          // console.dir(fragment)
        }
        break
      case 'nodeOps-insertBefore': 
        {
          let { parent, child, anchor } = data;
          let [parentId, childId] = [parent.nodeId, child.nodeId];

          if(parent.root === true) {
            parent = fragment // rootEl
          } else {
            parent = fragment.querySelector(`[nodeId='${parentId}']`)
          }

          child = fragment.querySelector(`[nodeId='${childId}']`)

          parent.insertBefore(child, anchor || null)

          // console.dir(fragment)
        }
        break
      case 'nodeOps-setElementText': 
        {
          const { el = {} , text = '' } = data
          const { nodeId } = el;
          fragment.querySelector(`[nodeId='${nodeId}']`).textContent = text
        }
        break
      case 'add-event':
        {
          const { events, mode = false, nodeId } = data
          for(let event of events) {
            fragment.querySelector(`[nodeId='${nodeId}']`).addEventListener(event, () => {
              workerThread.postMessage({
                type: event,
                data: {
                  nodeId
                }
              })
            }, mode)
          }
        }
        break
      default: 
        console.error(`type: ${type} is not found`);
    }
  }
}

function createEleDom(tag, text, nodeId) {
  console.log(tag)
  const ele = tag !== 'text' ? 
    document.createElement(tag) : 
    document.createTextNode(text);
  ele.setAttribute('nodeId', nodeId)
  return ele;
}

// function visitVnode (vnode) {
//   const { tag = 'div', children = [], events = [], uid = 0, attr = {} } = vnode
//   const dom = document.createElement(tag)
//   // console.log(dom, uid)
//   dom.setAttribute(`${uidName}`, uid);
//   Object.keys(attr || {}).map(v =>
//     dom.setAttribute(v, attr[v])
//   )
 
//   if(events.indexOf('click') > -1) {
//     console.log(events, dom, uid)
//     dom.addEventListener('click', (e) => {
//       console.log(e.target, +e.target.getAttribute(`${uidName}`))
//       const _uid = +e.target.getAttribute(`${uidName}`);

//       workerThread.postMessage({
//         type: 'click',
//         data: {
//           uid: _uid,
//         }
//       })
//     })
//   }

//   if(typeof children == 'string') {
//     dom.innerHTML = children
//   }

//   if(Array.isArray(children)) {
//     for(let n of children) {
//       dom.appendChild(visitVnode(n))
//     }
//   }

//   return dom;
// }
// function renderVnode(vnode) {
//   const frag = visitVnode(vnode)
  
//   return {
//     content: frag,
//     $mount: (el) => {
//       if(typeof el === 'string' && el.slice(0, 1) === '#') {
//         const ele = document.getElementById(el.slice(1));

//         return ele.appendChild(frag)
//       }

//       document.body.appendChild(frag)
//     }
//   }
// }

