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
  const domParent = fiber.parent.dom;
  /*根据fiber的effectTag属性判断是否要增加或删去结点 */
  if (fiber.effectTag === "PLACEMENT" && fiber.dom) {
    //增加
    domParent.appendChild(fiber.dom); //给fiber的父节点插入当前fiber的dom节点，这里就算是完全在dom上插入fiber节点了
  } else if (fiber.effectTag === "UPDATE" && fiber.dom) {
    //更新
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    //删除
    domParent.removeChild(fiber.dom);
  }

  commitWork(fiber.child); //遍历子节点和兄弟节点，直到为null
  commitWork(fiber.sibling);
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
  /*执行当前fiber节点的工作*/
  if (!fiber.dom) {
    //给fiber创建dom
    fiber.dom = createDom(fiber);
  }

  /*处理子节点*/
  const elements = fiber.props.children; //当前fiber的子元素
  reconcileChildren(fiber, elements);

  /*寻找下一个单元 */
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

function reconcileChildren(wipFiber/*当前fiber*/, elements/*fiber对象的子元素*/) {
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
};

/** @jsx Didact.createElement */
const container = document.getElementById("root");

const updateValue = (e) => {
  rerender(e.target.value);
};
/*这里不是通过state来完成更新,而是通过oninput事件触发rerender使得再次渲染*/
const rerender = (value) => {
  const element = (
    <div>
      <input onInput={updateValue} value={value} />
      <h2>Hello {value}</h2>
    </div>
  );
  Didact.render(element, container);
};
/*初始化 */
rerender("World");
