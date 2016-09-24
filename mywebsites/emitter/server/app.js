const React = require('react');
const ReactDOM = require('react-dom');
const Emitter = require('./../client/emitterView.jsx');
ReactDOM.render(<Emitter ticker={[]} chart={{timestamps:[], numbers:[[]]}}/>, document.getElementById('main'));