/* 实现基本react */
/* jsx需要通过babel处理，所以该文件不能直接引入，要通过babel编译之后才可以 */
/**createElement创建一个element对象，属性和之前的相同；child需要判断，如果为字符串就通过createTextElement创建文本形式对象 */
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
/**针对children为字符串形式的处理，即转换为TEXT_ELEMENT格式的element对象 */
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: [],
    },
  };
}
/**渲染函数，这里的element是jsx解析之后的element对象 */
function render(element, container) {
  console.log(element);
  //element的结构是{type:'xx',props:{id:'xxx',children:Array(n)}}
  const dom = //根据节点类型的不同创建不同类型element对象
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("") //这里使用的是dom对象的创建；前面是自定义的createElement
      : document.createElement(element.type);
  Object.keys(element.props)//['id','children']
    .filter((key) => key !== "children")
    .forEach((name) => {
      dom[name] = element.props[name];
    });//把props中除children属性之外的（即jsx的html标签上的id、class等属性）复制给创建出的标准dom节点

  element.props.children.forEach(
    (child) => render(child, dom) //递归渲染子节点
  );
  container.appendChild(dom);
}

const Didact = {
  createElement,
  render,
};
/* 这个注释告诉babel使用自己定义的createElement */
/** @jsx Didact.createElement */
const element = (
  <div id="test">
    <h1>hello world</h1>
  </div>
);

const container = document.getElementById("root");
Didact.render(element, container);
