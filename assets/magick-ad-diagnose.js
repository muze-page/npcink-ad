(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function copyText(text) {
    if (!text) {
      return Promise.resolve(false);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () {
          return true;
        },
        function () {
          return false;
        }
      );
    }
    try {
      var textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'readonly');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return Promise.resolve(ok);
    } catch (err) {
      return Promise.resolve(false);
    }
  }

  ready(function () {
    var root = document.getElementById('magick-ad-diagnose');
    if (!root) {
      return;
    }

    var body = root.querySelector('.magick-ad-diagnose__body');
    var content = document.getElementById('magick-ad-diagnose-content');
    var buttons = root.querySelectorAll('.magick-ad-diagnose__btn');

    function setCollapsed(collapsed) {
      if (!body) {
        return;
      }
      if (collapsed) {
        body.style.display = 'none';
        root.classList.add('is-collapsed');
      } else {
        body.style.display = '';
        root.classList.remove('is-collapsed');
      }
    }

    buttons.forEach(function (btn) {
      var action = btn.getAttribute('data-action');
      if (!action) {
        return;
      }
      btn.addEventListener('click', function () {
        if (action === 'toggle') {
          var collapsed = root.classList.contains('is-collapsed');
          setCollapsed(!collapsed);
          btn.textContent = collapsed ? '折叠' : '展开';
          return;
        }
        if (action === 'close') {
          root.style.display = 'none';
          return;
        }
        if (action === 'copy') {
          var text = content ? content.textContent : '';
          copyText(text).then(function (ok) {
            var original = btn.textContent;
            btn.textContent = ok ? '已复制' : '复制失败';
            setTimeout(function () {
              btn.textContent = original;
            }, 1200);
          });
        }
      });
    });
  });
})();
