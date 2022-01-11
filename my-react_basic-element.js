/*基本原理 */
const element = {
  //一个element元素相当于一个有type和props属性的对象，这个就相当于jsx的<h1 title="test">hello</h1>
  type: "h1",
  props: {
    title: "test",
    children: "hello",
  },
};

const container = document.getElementById("root");
/*创建节点，类型是element对象的type */
const node = document.createElement(element.type);
node.title = element.props.title;
/*创建内容，这里不用innerText的原因是为了和其他类型保持一致 */
const text = document.createTextNode("");
text.nodeValue = element.props.children;
/*插入到dom中 */
node.appendChild(text);
container.appendChild(node);
