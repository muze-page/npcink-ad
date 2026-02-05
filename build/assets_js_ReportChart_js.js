"use strict";
(globalThis["webpackChunkmagick_ad"] = globalThis["webpackChunkmagick_ad"] || []).push([["assets_js_ReportChart_js"],{

/***/ "./assets/js/ReportChart.js"
/*!**********************************!*\
  !*** ./assets/js/ReportChart.js ***!
  \**********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! recharts */ "./node_modules/.pnpm/recharts@2.15.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/recharts/es6/component/Tooltip.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! recharts */ "./node_modules/.pnpm/recharts@2.15.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/recharts/es6/component/ResponsiveContainer.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! recharts */ "./node_modules/.pnpm/recharts@2.15.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/recharts/es6/cartesian/CartesianGrid.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! recharts */ "./node_modules/.pnpm/recharts@2.15.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/recharts/es6/cartesian/Line.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! recharts */ "./node_modules/.pnpm/recharts@2.15.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/recharts/es6/cartesian/XAxis.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! recharts */ "./node_modules/.pnpm/recharts@2.15.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/recharts/es6/cartesian/YAxis.js");
/* harmony import */ var recharts__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! recharts */ "./node_modules/.pnpm/recharts@2.15.4_react-dom@18.3.1_react@18.3.1__react@18.3.1/node_modules/recharts/es6/chart/LineChart.js");


const ReportChart = ({
  data
}) => {
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(recharts__WEBPACK_IMPORTED_MODULE_2__.ResponsiveContainer, {
    width: "100%",
    height: 320
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(recharts__WEBPACK_IMPORTED_MODULE_7__.LineChart, {
    data: data
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(recharts__WEBPACK_IMPORTED_MODULE_3__.CartesianGrid, {
    strokeDasharray: "3 3"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(recharts__WEBPACK_IMPORTED_MODULE_5__.XAxis, {
    dataKey: "date"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(recharts__WEBPACK_IMPORTED_MODULE_6__.YAxis, null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(recharts__WEBPACK_IMPORTED_MODULE_1__.Tooltip, null), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(recharts__WEBPACK_IMPORTED_MODULE_4__.Line, {
    type: "monotone",
    dataKey: "views",
    stroke: "#1e1e1e",
    strokeWidth: 2,
    dot: false,
    name: "\u5C55\u793A"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(recharts__WEBPACK_IMPORTED_MODULE_4__.Line, {
    type: "monotone",
    dataKey: "clicks",
    stroke: "#2271b1",
    strokeWidth: 2,
    dot: false,
    name: "\u70B9\u51FB"
  })));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (ReportChart);

/***/ }

}]);
//# sourceMappingURL=assets_js_ReportChart_js.js.map