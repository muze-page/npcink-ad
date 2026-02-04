"use strict";
(globalThis["webpackChunkmagick_ad"] = globalThis["webpackChunkmagick_ad"] || []).push([["assets_js_Dashboard_js"],{

/***/ "./assets/js/Dashboard.js"
/*!********************************!*\
  !*** ./assets/js/Dashboard.js ***!
  \********************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! react */ "react");
/* harmony import */ var react__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(react__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @wordpress/element */ "@wordpress/element");
/* harmony import */ var _wordpress_element__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__);
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! @wordpress/api-fetch */ "@wordpress/api-fetch");
/* harmony import */ var _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(_wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2__);
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! @wordpress/components */ "@wordpress/components");
/* harmony import */ var _wordpress_components__WEBPACK_IMPORTED_MODULE_3___default = /*#__PURE__*/__webpack_require__.n(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__);




const ReportChart = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.lazy)(() => Promise.all(/*! import() */[__webpack_require__.e("vendors-node_modules_pnpm_recharts_2_15_4_react-dom_18_3_1_react_18_3_1__react_18_3_1_node_mo-2a0d10"), __webpack_require__.e("assets_js_ReportChart_js")]).then(__webpack_require__.bind(__webpack_require__, /*! ./ReportChart */ "./assets/js/ReportChart.js")));
const Dashboard = () => {
  const [range, setRange] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('7');
  const [data, setData] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)([]);
  const [isLoading, setIsLoading] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(false);
  const [error, setError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [breakdowns, setBreakdowns] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)({
    slot: [],
    position: [],
    container: [],
    ad_id: []
  });
  const [breakdownError, setBreakdownError] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)(null);
  const [breakdownFilter, setBreakdownFilter] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('');
  const [breakdownSort, setBreakdownSort] = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useState)('views_desc');
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default()({
      path: `/magick-ad/v1/report?days=${range}`
    }).then(response => {
      if (!isMounted) {
        return;
      }
      setData(Array.isArray(response) ? response : []);
      setIsLoading(false);
    }).catch(err => {
      if (!isMounted) {
        return;
      }
      setError(err);
      setIsLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, [range]);
  (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useEffect)(() => {
    let isMounted = true;
    setBreakdownError(null);
    const groups = ['slot', 'position', 'container', 'ad_id'];
    Promise.all(groups.map(group => _wordpress_api_fetch__WEBPACK_IMPORTED_MODULE_2___default()({
      path: `/magick-ad/v1/report-dim?days=${range}&group_by=${group}`
    }).then(response => Array.isArray(response) ? response : []))).then(responses => {
      if (!isMounted) {
        return;
      }
      setBreakdowns({
        slot: responses[0] || [],
        position: responses[1] || [],
        container: responses[2] || [],
        ad_id: responses[3] || []
      });
    }).catch(err => {
      if (!isMounted) {
        return;
      }
      setBreakdownError(err);
    });
    return () => {
      isMounted = false;
    };
  }, [range]);
  const summary = (0,_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.useMemo)(() => {
    return data.reduce((acc, item) => {
      acc.views += Number(item.views || 0);
      acc.clicks += Number(item.clicks || 0);
      return acc;
    }, {
      views: 0,
      clicks: 0
    });
  }, [data]);
  const ctr = summary.views ? (summary.clicks / summary.views * 100).toFixed(2) : '0.00';
  const applyBreakdownFilter = items => {
    const term = breakdownFilter.trim().toLowerCase();
    if (!term) {
      return items;
    }
    return items.filter(item => String(item.dimension || '').toLowerCase().includes(term));
  };
  const applyBreakdownSort = items => {
    const [key, direction] = breakdownSort.split('_');
    const dir = direction === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      const viewsA = Number(a.views || 0);
      const viewsB = Number(b.views || 0);
      const clicksA = Number(a.clicks || 0);
      const clicksB = Number(b.clicks || 0);
      const ctrA = viewsA ? clicksA / viewsA : 0;
      const ctrB = viewsB ? clicksB / viewsB : 0;
      switch (key) {
        case 'clicks':
          return dir * (clicksA - clicksB);
        case 'ctr':
          return dir * (ctrA - ctrB);
        case 'views':
        default:
          return dir * (viewsA - viewsB);
      }
    });
  };
  const formatDate = date => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const getRangeDates = () => {
    const days = Number(range) || 7;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    return {
      start: formatDate(start),
      end: formatDate(end)
    };
  };
  const downloadCsv = (filename, items) => {
    if (!items.length) {
      return;
    }
    const rangeDates = getRangeDates();
    const rows = [['dimension', 'views', 'clicks', 'ctr', 'range_start', 'range_end'], ...items.map(item => {
      const views = Number(item.views || 0);
      const clicks = Number(item.clicks || 0);
      const rowCtr = views ? clicks / views * 100 : 0;
      return [String(item.dimension || ''), String(views), String(clicks), rowCtr.toFixed(2), rangeDates.start, rangeDates.end];
    })];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const renderBreakdown = (title, items, key) => {
    const filtered = applyBreakdownFilter(items);
    const sorted = applyBreakdownSort(filtered);
    return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
      className: "magick-ad-dashboard__section-header"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
      className: "magick-ad-dashboard__section-title"
    }, title), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Button, {
      variant: "secondary",
      onClick: () => downloadCsv(`magick-ad-${key}-${range}d.csv`, sorted),
      disabled: !sorted.length
    }, "\u5BFC\u51FA CSV")), !sorted.length && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
      className: "description"
    }, "\u6682\u65E0\u6570\u636E"), !!sorted.length && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("table", {
      className: "magick-ad-dashboard__table"
    }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("thead", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("tr", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("th", null, "\u7EF4\u5EA6"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("th", null, "\u5C55\u793A"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("th", null, "\u70B9\u51FB"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("th", null, "CTR"))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("tbody", null, sorted.slice(0, 10).map(item => {
      const views = Number(item.views || 0);
      const clicks = Number(item.clicks || 0);
      const rowCtr = views ? (clicks / views * 100).toFixed(2) : '0.00';
      return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("tr", {
        key: item.dimension
      }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("td", null, item.dimension), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("td", null, views), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("td", null, clicks), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("td", null, rowCtr, "%"));
    })))));
  };
  return (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-dashboard"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-header"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("h1", null, "\u7EDF\u8BA1\u770B\u677F"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "description"
  }, "\u8FD1 7 / 30 \u5929\u6295\u653E\u8D8B\u52BF")), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.SelectControl, {
    label: "\u65E5\u671F\u8303\u56F4",
    value: range,
    options: [{
      label: '最近 7 天',
      value: '7'
    }, {
      label: '最近 30 天',
      value: '30'
    }],
    onChange: value => setRange(value)
  })), isLoading && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Notice, {
    status: "info"
  }, "\u52A0\u8F7D\u4E2D\u2026"), error && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Notice, {
    status: "error",
    isDismissible: true
  }, error.message || '请求失败'), !isLoading && !error && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-dashboard__content"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-dashboard__cards"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "magick-ad-dashboard__label"
  }, "\u603B\u5C55\u793A"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "magick-ad-dashboard__value"
  }, summary.views))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "magick-ad-dashboard__label"
  }, "\u603B\u70B9\u51FB"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "magick-ad-dashboard__value"
  }, summary.clicks))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "magick-ad-dashboard__label"
  }, "\u5E73\u5747 CTR"), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("p", {
    className: "magick-ad-dashboard__value"
  }, ctr, "%")))), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Card, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.CardBody, null, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-dashboard__chart"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_element__WEBPACK_IMPORTED_MODULE_1__.Suspense, {
    fallback: (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Notice, {
      status: "info"
    }, "\u56FE\u8868\u52A0\u8F7D\u4E2D\u2026")
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(ReportChart, {
    data: data
  }))))), breakdownError && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.Notice, {
    status: "error",
    isDismissible: true
  }, breakdownError.message || '维度报表加载失败'), !breakdownError && (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-dashboard__breakdowns"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)("div", {
    className: "magick-ad-dashboard__filters"
  }, (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.TextControl, {
    label: "\u7B5B\u9009\u7EF4\u5EA6",
    value: breakdownFilter,
    onChange: value => setBreakdownFilter(value),
    placeholder: "\u8F93\u5165\u5173\u952E\u8BCD\u8FC7\u6EE4"
  }), (0,react__WEBPACK_IMPORTED_MODULE_0__.createElement)(_wordpress_components__WEBPACK_IMPORTED_MODULE_3__.SelectControl, {
    label: "\u6392\u5E8F",
    value: breakdownSort,
    options: [{
      label: '展示量（高→低）',
      value: 'views_desc'
    }, {
      label: '展示量（低→高）',
      value: 'views_asc'
    }, {
      label: '点击量（高→低）',
      value: 'clicks_desc'
    }, {
      label: '点击量（低→高）',
      value: 'clicks_asc'
    }, {
      label: 'CTR（高→低）',
      value: 'ctr_desc'
    }, {
      label: 'CTR（低→高）',
      value: 'ctr_asc'
    }],
    onChange: value => setBreakdownSort(value)
  })), renderBreakdown('Slot 表现', breakdowns.slot, 'slot'), renderBreakdown('位置表现', breakdowns.position, 'position'), renderBreakdown('容器表现', breakdowns.container, 'container'), renderBreakdown('广告表现（ad_id）', breakdowns.ad_id, 'ad_id'))));
};
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (Dashboard);

/***/ }

}]);
//# sourceMappingURL=assets_js_Dashboard_js.js.map