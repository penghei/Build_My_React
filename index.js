"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function createElement(type, props) {
  for (var _len = arguments.length, children = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    children[_key - 2] = arguments[_key];
  }

  return {
    type: type,
    props: _objectSpread(_objectSpread({}, props), {}, {
      children: children.map(function (child) {
        return _typeof(child) === "object" ? child : createTextElement(child);
      })
    })
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}
/**创建fiber的dom属性 */


function createDom(fiber) {
  var dom = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props);
  return dom;
}

var isEvent = function isEvent(key) {
  return key.startsWith("on");
}; //判断事件,即比如onClick这样的


var isProperty = function isProperty(key) {
  return key !== "children" && !isEvent(key);
}; //非children并且非事件的各种属性


var isNew = function isNew(prev, next) {
  return function (key) {
    return prev[key] !== next[key];
  };
}; //判断是否是新属性


var isGone = function isGone(prev, next) {
  return function (key) {
    return !(key in next);
  };
};

function updateDom(dom, prevProps, nextProps) {
  //删除或改变eventListener
  Object.keys(prevProps).filter(isEvent).filter(function (key) {
    return !(key in nextProps) || isNew(prevProps, nextProps)(key);
  }).forEach(function (name) {
    var eventType = name.toLowerCase().substring(2);
    dom.removeEventListener(eventType, prevProps[name]); //移除该节点上的事件监听
  }); // 添加新eventListener

  Object.keys(nextProps).filter(isEvent).filter(isNew(prevProps, nextProps)).forEach(function (name) {
    var eventType = name.toLowerCase().substring(2);
    dom.addEventListener(eventType, nextProps[name]);
  }); // 删除旧属性

  Object.keys(prevProps).filter(isProperty).filter(isGone(prevProps, nextProps)).forEach(function (name) {
    //把属性值清掉
    dom[name] = "";
  }); // 增加或更新属性

  Object.keys(nextProps).filter(isProperty).filter(isNew(prevProps, nextProps)).forEach(function (name) {
    //更新或增加新属性
    dom[name] = nextProps[name];
  });
}
/*当Reconciler完成工作，提交给render进行渲染dom */


function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot; //保存最后提交的fiber树，用于和更新的比较

  wipRoot = null; //提交完成后令根节点为null
}

function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  /*从当前fiber一直向上找，直到找到有dom节点的fiber元素 */


  var domParentFiber = fiber.parent;

  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }

  var domParent = domParentFiber.dom;
  /*根据fiber的effectTag属性判断是否要增加或删去结点 */

  if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
    //增加
    domParent.appendChild(fiber.dom); //给fiber的父节点插入当前fiber的dom节点，这里就算是完全在dom上插入fiber节点了
  } else if (fiber.effectTag === "UPDATE" && fiber.dom) {
    //更新
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    //删除
    commitDeletion(fiber, domParent);
  }

  commitWork(fiber.child); //遍历子节点和兄弟节点，直到为null

  commitWork(fiber.sibling);
}
/**递归删除fiber的dom节点 */


function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, domParent);
  }
}
/**渲染fiber对象 */


function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot //用alternate把currentFiberTree和WipFiberTree连接起来，用diff算法比较更新

  };
  console.log(wipRoot);
  deletions = []; //删除结点数组

  nextUnitOfWork = wipRoot;
}
/* react Reconciler的函数（协调器，用于把更新工作从不可中断的同步任务变成可中断的 */


var nextUnitOfWork = null; //下一个工作单元

var wipRoot = null; //区分开正在展示的fiber树和正在构建的fiber树，wip就是正在构建的fiber根结点

var currentRoot = null; //最后提交的fiber树

var deletions = null;

function workLoop(deadline) {
  //参数ddl是requestIdleCallback给出的，表示当前剩余时间
  var shouldYield = false; //判断是否有剩余时间

  while (nextUnitOfWork && !shouldYield) {
    //处理一个fiber节点，返回下一个节点
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); //时间不足就取消循环

    shouldYield = deadline.timeRemaining() < 1;
  } //执行完毕提交dom树


  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  requestIdleCallback(workLoop);
}

requestIdleCallback(workLoop);
/**该函数会把当前节点加入dom、为子节点创建fiber和选择下个工作单元 */

function performUnitOfWork(fiber) {
  /*判断是否为函数组件*/
  var isFunctionComponent = fiber.type instanceof Function;

  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }

  if (fiber.child) {
    //如果有子节点就直接返回子节点
    return fiber.child;
  }

  var nextFiber = fiber;

  while (nextFiber) {
    if (nextFiber.sibling) {
      //没有子节点就返回兄弟节点
      return nextFiber.sibling;
    }

    nextFiber = nextFiber.parent; //两个都没有就返回“叔叔”节点，即兄弟节点的父节点
  }
}

var wipFiber = null;
var hookIndex = null;
/**函数组件特殊处理,children从函数运行得出（return），而不是直接从fiber.props获取*/

function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  var children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function useState(init) {
  var oldHook = wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex]; //oldHook取currentFiber的hook
  console.log(wipFiber)
  var hook = {
    //hook是数据结构，保存有state和queue，即更新队列
    state: oldHook ? oldHook.state : init,
    queue: []
  };
  /*这个actions是setState中传入的action的合集 */

  var actions = oldHook ? oldHook.queue : []; //actions是一组动作（函数），如果旧hook没有就创建一个空数组

  actions.forEach(function (act) {
    act instanceof Function ? hook.state = act(hook.state) : hook.state = act;
  }); //把每个action（执行的函数）都对hook维持的state调用一遍，相当于多个调用setState依次改变state

  var setState = function setState(action) {
    hook.queue.push(action); //hook的更新队列添加更新

    /*创建wipFiber树，赋值给nextUnitOfWork意味着开始更新*/

    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };

  wipFiber.hooks.push(hook); //之前的hook是在currentFiber中的，现在wipFiber要变成currentFiber，也需要push进去

  hookIndex++;
  return [hook.state, setState]; //state被hook持有，hook存在fiber树的hooks数组中；可能会有多个hook，每个hook维护一个独立的更新
  //调用该hook的setState就是创建新wipFiber树，并把新值或新操作放入hook持有的更新队列queue中
}
/**非函数组件啊，仍然是创建dom并拼接fiber树 */


function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }

  reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(wipFiber
/*当前fiber*/
, elements
/*fiber对象的子元素*/
) {
  var index = 0;
  var oldFiber = wipFiber.alternate && wipFiber.alternate.child; //旧fiber树

  var preSibling = null;

  while (index < elements.length || oldFiber) {
    //给每个子节点创建一个fiber对象
    var _element = elements[index];
    var newFiber = null;
    var sameType = oldFiber && _element && _element.type === oldFiber.type; //

    /*
      1.比较新旧fiber树中的元素类型,如果相同就认作sameType
      2.如果是sameType,保留dom结点并更新
      3.如果不是sameType但新fiber树中有,说明要添加
      4.如果不是sameType但新旧fiber树中有,说明要删除
      */

    if (sameType) {
      //更新元素
      newFiber = {
        type: oldFiber.type,
        //类型不变
        props: _element.props,
        //新fiber树中对应节点的props
        dom: oldFiber.dom,
        //保留dom元素
        parent: wipFiber,
        //父元素仍然是oldFiber的父元素,即wipFiber
        alternate: oldFiber,
        //和旧元素连接起来
        effectTag: "UPDATE" //增加这个属性表示当前是更新,在commit过程中告知render执行更新操作

      };
    }

    if (_element && !sameType) {
      //添加新节点
      newFiber = {
        type: _element.type,
        props: _element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT"
      };
    }

    if (oldFiber && !sameType) {
      //删除,即不用创建对应的新fiber结点
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber); //
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    /* 插入fiber树 */


    if (index === 0) {
      //把第一个子element作为当前fiber的子fiber
      wipFiber.child = newFiber;
    } else if (_element) {
      //其他的作为兄弟
      preSibling.sibling = newFiber;
    }

    preSibling = newFiber;
    /*
       第一次就创建了当前fiber对象的第一个子元素的fiber，叫做newFiber，把他赋给fiber.child；
      令当前节点为之后节点的前置兄弟节点，这样之后的节点就都是按照兄弟链延伸
      本质上是一个DFS
      */

    index++;
  }
}

var Didact = {
  createElement: createElement,
  render: render,
  useState: useState
};
/** @jsx Didact.createElement */

function Counter() {
  var _Didact$useState = Didact.useState(1),
      _Didact$useState2 = _slicedToArray(_Didact$useState, 2),
      state = _Didact$useState2[0],
      setState = _Didact$useState2[1];

  var _Didact$useState3 = Didact.useState(0),
      _Didact$useState4 = _slicedToArray(_Didact$useState3, 2),
      num = _Didact$useState4[0],
      setNum = _Didact$useState4[1];

  return Didact.createElement("h1", {
    onClick: function onClick() {
      setState(function (c) {
        return c + 1;
      });
      setNum(function (n) {
        return n + 1;
      });
    }
  }, "Count: ", state, ":", num);
}

var element = Didact.createElement(Counter, null);
var container = document.getElementById("root");
Didact.render(element, container);
