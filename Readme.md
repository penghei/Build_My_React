简单创建了一个微型react
学习来源于https://pomb.us/build-your-own-react/

需要先用babel解析jsx成index.js再打开index.html即可
```
npx babel my-react_components.js -o index.js
```

- my-react是最基本的createElement和render函数的实现
- my-react_basic-element是element元素结构
- my-react_fiber是react的fiber架构，实现了事件处理
- my-react_hooks是最终产物，实现了函数组件和useState

