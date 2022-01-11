function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}
/**创建fiber的dom属性 */
function createDom(fiber) {
  const dom =
    fiber.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props);
  return dom;
}

const isEvent = (key) => key.startsWith("on"); //判断事件,即比如onClick这样的
const isProperty = (key) => key !== "children" && !isEvent(key); //非children并且非事件的各种属性
const isNew = (prev, next) => (key) => prev[key] !== next[key]; //判断是否是新属性
const isGone = (prev, next) => (key) => !(key in next);
function updateDom(dom, prevProps, nextProps) {
  //删除或改变eventListener
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]); //移除该节点上的事件监听
    });
  // 添加新eventListener
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
  // 删除旧属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => {
      //把属性值清掉
      dom[name] = "";
    });
  // 增加或更新属性
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
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
  let domParentFiber = fiber.parent;
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

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
      children: [element],
    },
    alternate: currentRoot, //用alternate把currentFiberTree和WipFiberTree连接起来，用diff算法比较更新
  };
  console.log(wipRoot);
  deletions = []; //删除结点数组
  nextUnitOfWork = wipRoot;
}

/* react Reconciler的函数（协调器，用于把更新工作从不可中断的同步任务变成可中断的 */
let nextUnitOfWork = null; //下一个工作单元
let wipRoot = null; //区分开正在展示的fiber树和正在构建的fiber树，wip就是正在构建的fiber根结点
let currentRoot = null; //最后提交的fiber树
let deletions = null;

function workLoop(deadline) {
  //参数ddl是requestIdleCallback给出的，表示当前剩余时间
  let shouldYield = false; //判断是否有剩余时间
  while (nextUnitOfWork && !shouldYield) {
    //处理一个fiber节点，返回下一个节点
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    //时间不足就取消循环
    shouldYield = deadline.timeRemaining() < 1;
  }
  //执行完毕提交dom树
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);

/**该函数会把当前节点加入dom、为子节点创建fiber和选择下个工作单元 */
function performUnitOfWork(fiber) {
  /*判断是否为函数组件*/
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    updateFunctionComponent(fiber);
  } else {
    updateHostComponent(fiber);
  }
  if (fiber.child) {
    //如果有子节点就直接返回子节点
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      //没有子节点就返回兄弟节点
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent; //两个都没有就返回“叔叔”节点，即兄弟节点的父节点
  }
}

let wipFiber = null;
let hookIndex = null;

/**函数组件特殊处理,children从函数运行得出（return），而不是直接从fiber.props获取*/
function updateFunctionComponent(fiber) {
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];
  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function useState(init) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex]; //oldHook取currentFiber的hook
  const hook = {
    //hook是数据结构，保存有state和queue，即更新队列
    state: oldHook ? oldHook.state : init,
    queue: [],
  };

  /*这个actions是setState中传入的action的合集 */
  const actions = oldHook ? oldHook.queue : []; //actions是一组动作（函数），如果旧hook没有就创建一个空数组
  actions.forEach((act) => {
    act instanceof Function
      ? (hook.state = act(hook.state))
      : (hook.state = act);
  });

  //把每个action（执行的函数）都对hook维持的state调用一遍，相当于多个调用setState依次改变state

  const setState = (action) => {
    hook.queue.push(action); //hook的更新队列添加更新
    /*创建wipFiber树，赋值给nextUnitOfWork意味着开始更新*/
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };
    nextUnitOfWork = wipRoot;
    deletions = [];
  };
  wipFiber.hooks.push(hook); //之前的hook是在currentFiber中的，现在wipFiber要变成currentFiber，也需要push进去
  hookIndex++;
  return [hook.state, setState];
  //state被hook持有，hook存在fiber树的hooks数组中；可能会有多个hook，每个hook维护一个独立的更新
  //调用该hook的setState就是创建新wipFiber树，并把新值或新操作放入hook持有的更新队列queue中
}

/**非函数组件啊，仍然是创建dom并拼接fiber树 */
function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

function reconcileChildren(
  wipFiber /*当前fiber*/,
  elements /*fiber对象的子元素*/
) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child; //旧fiber树

  let preSibling = null;
  while (index < elements.length || oldFiber) {
    //给每个子节点创建一个fiber对象
    const element = elements[index];
    let newFiber = null;
    const sameType = oldFiber && element && element.type === oldFiber.type; //
    /*
      1.比较新旧fiber树中的元素类型,如果相同就认作sameType
      2.如果是sameType,保留dom结点并更新
      3.如果不是sameType但新fiber树中有,说明要添加
      4.如果不是sameType但新旧fiber树中有,说明要删除
      */
    if (sameType) {
      //更新元素
      newFiber = {
        type: oldFiber.type, //类型不变
        props: element.props, //新fiber树中对应节点的props
        dom: oldFiber.dom, //保留dom元素
        parent: wipFiber, //父元素仍然是oldFiber的父元素,即wipFiber
        alternate: oldFiber, //和旧元素连接起来
        effectTag: "UPDATE", //增加这个属性表示当前是更新,在commit过程中告知render执行更新操作
      };
    }
    if (element && !sameType) {
      //添加新节点
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
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
    } else if (element) {
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

const Didact = {
  createElement,
  render,
  useState,
};

/** @jsx Didact.createElement */
function Counter() {
  const [state, setState] = Didact.useState(1);
  const [num, setNum] = Didact.useState(0);
  return (
    <h1
      onClick={() => {
        setState((c) => c + 1);
        setNum((n) => n + 1);
      }}
    >
      Count: {state}:{num}
    </h1>
  );
}
const element = <Counter />;
const container = document.getElementById("root");
Didact.render(element, container);
