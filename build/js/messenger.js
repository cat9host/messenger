(function() {
  var $, ActionMessenger, BaseView, Events, RetryingMessage, _, _Message, _Messenger, ref, ref1, ref2,
    indexOf = [].indexOf;

  $ = jQuery;

  _ = (ref = window._) != null ? ref : window.Messenger._;

  Events = (ref1 = typeof Backbone !== "undefined" && Backbone !== null ? Backbone.Events : void 0) != null ? ref1 : window.Messenger.Events;

  // Emulates some Backbone-like eventing and element management for ease of use
  // while attempting to avoid a hard dependency on Backbone itself
  BaseView = class BaseView {
    constructor(options) {
      $.extend(this, Events);
      if (_.isObject(options)) {
        if (options.el) {
          this.setElement(options.el);
        }
        this.model = options.model;
      }
      this.initialize.apply(this, arguments);
    }

    setElement(el) {
      this.$el = $(el);
      return this.el = this.$el[0];
    }

    delegateEvents(events) {
      var delegateEventSplitter, eventName, key, match, method, results, selector;
      if (!(events || (events = _.result(this, "events")))) {
        return;
      }
      this.undelegateEvents();
      delegateEventSplitter = /^(\S+)\s*(.*)$/;
      results = [];
      for (key in events) {
        method = events[key];
        if (!_.isFunction(method)) {
          method = this[events[key]];
        }
        if (!method) {
          throw new Error("Method \"" + events[key] + "\" does not exist");
        }
        match = key.match(delegateEventSplitter);
        eventName = match[1];
        selector = match[2];
        method = _.bind(method, this);
        eventName += `.delegateEvents${this.cid}`;
        if (selector === '') {
          results.push(this.jqon(eventName, method));
        } else {
          results.push(this.jqon(eventName, selector, method));
        }
      }
      return results;
    }

    jqon(eventName, selector, method) {
      if (this.$el.on != null) {
        return this.$el.on(...arguments);
      } else {
        // Support for jQuery > 1.7
        if (method == null) {
          method = selector;
          selector = void 0;
        }
        if (selector != null) {
          return this.$el.delegate(selector, eventName, method);
        } else {
          return this.$el.bind(eventName, method);
        }
      }
    }

    jqoff(eventName) {
      if (this.$el.off != null) {
        return this.$el.off(...arguments);
      } else {
        this.$el.undelegate();
        return this.$el.unbind(eventName);
      }
    }

    undelegateEvents() {
      return this.jqoff(`.delegateEvents${this.cid}`);
    }

    remove() {
      this.undelegateEvents();
      return this.$el.remove();
    }

  };

  _Message = (function() {
    class _Message extends BaseView {
      initialize(opts = {}) {
        this.shown = false;
        this.rendered = false;
        this.messenger = opts.messenger;
        return this.options = $.extend({}, this.options, opts, this.defaults);
      }

      show() {
        var wasShown;
        if (!this.rendered) {
          this.render();
        }
        this.$message.removeClass('messenger-hidden');
        wasShown = this.shown;
        this.shown = true;
        if (!wasShown) {
          return this.trigger('show');
        }
      }

      hide() {
        var wasShown;
        if (!this.rendered) {
          return;
        }
        this.$message.addClass('messenger-hidden');
        wasShown = this.shown;
        this.shown = false;
        if (wasShown) {
          return this.trigger('hide');
        }
      }

      cancel() {
        return this.hide();
      }

      update(opts) {
        var ref2;
        if (_.isString(opts)) {
          opts = {
            message: opts
          };
        }
        $.extend(this.options, opts);
        this.lastUpdate = new Date();
        this.rendered = false;
        this.events = (ref2 = this.options.events) != null ? ref2 : {};
        this.render();
        this.actionsToEvents();
        this.delegateEvents();
        this.checkClickable();
        if (this.options.hideAfter) {
          this.$message.addClass('messenger-will-hide-after');
          if (this._hideTimeout != null) {
            clearTimeout(this._hideTimeout);
          }
          this._hideTimeout = setTimeout(() => {
            return this.hide();
          }, this.options.hideAfter * 1000);
        } else {
          this.$message.removeClass('messenger-will-hide-after');
        }
        if (this.options.hideOnNavigate) {
          this.$message.addClass('messenger-will-hide-on-navigate');
          if ((typeof Backbone !== "undefined" && Backbone !== null ? Backbone.history : void 0) != null) {
            Backbone.history.on('route', () => {
              return this.hide();
            });
          }
        } else {
          this.$message.removeClass('messenger-will-hide-on-navigate');
        }
        return this.trigger('update', this);
      }

      scrollTo() {
        if (!this.options.scroll) {
          return;
        }
        return $.scrollTo(this.$el, {
          duration: 400,
          offset: {
            left: 0,
            top: -20
          }
        });
      }

      timeSinceUpdate() {
        if (this.lastUpdate) {
          return (new Date()) - this.lastUpdate;
        } else {
          return null;
        }
      }

      actionsToEvents() {
        var act, name, ref2, results;
        ref2 = this.options.actions;
        results = [];
        for (name in ref2) {
          act = ref2[name];
          results.push(this.events[`click [data-action=\"${name}\"] a`] = ((act) => {
            return (e) => {
              e.preventDefault();
              e.stopPropagation();
              this.trigger(`action:${name}`, act, e);
              return act.action.call(this, e, this);
            };
          })(act));
        }
        return results;
      }

      checkClickable() {
        var evt, name, ref2, results;
        ref2 = this.events;
        results = [];
        for (name in ref2) {
          evt = ref2[name];
          if (name === 'click') {
            results.push(this.$message.addClass('messenger-clickable'));
          } else {
            results.push(void 0);
          }
        }
        return results;
      }

      undelegateEvents() {
        var ref2;
        return (ref2 = this.$message) != null ? ref2.removeClass('messenger-clickable') : void 0;
      }

      parseActions() {
        var act, actions, n_act, name, ref2;
        actions = [];
        ref2 = this.options.actions;
        for (name in ref2) {
          act = ref2[name];
          n_act = $.extend({}, act);
          n_act.name = name;
          if (n_act.label == null) {
            n_act.label = name;
          }
          actions.push(n_act);
        }
        return actions;
      }

      template(opts) {
        var $action, $actions, $cancel, $link, $message, $text, action, i, len, ref2;
        $message = $(`<div class='messenger-message message alert ${opts.type} message-${opts.type} alert-${opts.type}'>`);
        if (opts.showCloseButton) {
          $cancel = $('<button type="button" class="messenger-close" data-dismiss="alert">');
          $cancel.html(opts.closeButtonText);
          $cancel.click(() => {
            var base;
            this.cancel();
            if (typeof (base = this.options).onClickClose === "function") {
              base.onClickClose();
            }
            return true;
          });
          $message.append($cancel);
        }
        if (opts.escapeText) {
          $text = $('<div class="messenger-message-inner"></div>').text(opts.message);
        } else {
          $text = $(`<div class="messenger-message-inner">${opts.message}</div>`);
        }
        $message.append($text);
        if (opts.actions.length) {
          $actions = $('<div class="messenger-actions">');
        }
        ref2 = opts.actions;
        for (i = 0, len = ref2.length; i < len; i++) {
          action = ref2[i];
          $action = $('<span>');
          $action.attr('data-action', `${action.name}`);
          $link = $('<a>');
          $link.html(action.label);
          $action.append($('<span class="messenger-phrase">'));
          $action.append($link);
          $actions.append($action);
        }
        $message.append($actions);
        return $message;
      }

      render() {
        var opts;
        if (this.rendered) {
          return;
        }
        if (!this._hasSlot) {
          this.setElement(this.messenger._reserveMessageSlot(this));
          this._hasSlot = true;
        }
        opts = $.extend({}, this.options, {
          actions: this.parseActions()
        });
        this.$message = $(this.template(opts));
        this.$el.html(this.$message);
        this.shown = true;
        this.rendered = true;
        return this.trigger('render');
      }

    };

    _Message.prototype.defaults = {
      hideAfter: 10,
      scroll: true,
      closeButtonText: "&times;",
      escapeText: false
    };

    return _Message;

  }).call(this);

  RetryingMessage = class RetryingMessage extends _Message {
    initialize() {
      return this._timers = {};
    }

    cancel() {
      this.clearTimers();
      this.hide();
      if ((this._actionInstance != null) && (this._actionInstance.abort != null)) {
        return this._actionInstance.abort();
      }
    }

    clearTimers() {
      var name, ref2, ref3, timer;
      ref2 = this._timers;
      for (name in ref2) {
        timer = ref2[name];
        clearTimeout(timer);
      }
      this._timers = {};
      return (ref3 = this.$message) != null ? ref3.removeClass('messenger-retry-soon messenger-retry-later') : void 0;
    }

    render() {
      var action, name, ref2, results;
      this.clearTimers();
      ref2 = this.options.actions;
      results = [];
      for (name in ref2) {
        action = ref2[name];
        if (action.auto) {
          results.push(this.startCountdown(name, action));
        } else {
          results.push(void 0);
        }
      }
      return results;
    }

    renderPhrase(action, time) {
      var phrase;
      phrase = action.phrase.replace('TIME', this.formatTime(time));
      return phrase;
    }

    formatTime(time) {
      var pluralize;
      pluralize = function(num, str) {
        num = Math.floor(num);
        if (num !== 1) {
          str = str + 's';
        }
        return 'in ' + num + ' ' + str;
      };
      if (Math.floor(time) === 0) {
        return 'now...';
      }
      if (time < 60) {
        return pluralize(time, 'second');
      }
      time /= 60;
      if (time < 60) {
        return pluralize(time, 'minute');
      }
      time /= 60;
      return pluralize(time, 'hour');
    }

    startCountdown(name, action) {
      var $phrase, ref2, remaining, tick;
      if (this._timers[name] != null) {
        return;
      }
      $phrase = this.$message.find(`[data-action='${name}'] .messenger-phrase`);
      remaining = (ref2 = action.delay) != null ? ref2 : 3;
      if (remaining <= 10) {
        this.$message.removeClass('messenger-retry-later');
        this.$message.addClass('messenger-retry-soon');
      } else {
        this.$message.removeClass('messenger-retry-soon');
        this.$message.addClass('messenger-retry-later');
      }
      tick = () => {
        var delta;
        $phrase.text(this.renderPhrase(action, remaining));
        if (remaining > 0) {
          delta = Math.min(remaining, 1);
          remaining -= delta;
          return this._timers[name] = setTimeout(tick, delta * 1000);
        } else {
          this.$message.removeClass('messenger-retry-soon messenger-retry-later');
          delete this._timers[name];
          return action.action();
        }
      };
      return tick();
    }

  };

  _Messenger = (function() {
    class _Messenger extends BaseView {
      initialize(options1 = {}) {
        this.options = options1;
        this.history = [];
        return this.messageDefaults = $.extend({}, this.messageDefaults, this.options.messageDefaults);
      }

      render() {
        return this.updateMessageSlotClasses();
      }

      findById(id) {
        return _.filter(this.history, function(rec) {
          return rec.msg.options.id === id;
        });
      }

      _reserveMessageSlot(msg) {
        var $slot, dmsg;
        $slot = $('<li>');
        $slot.addClass('messenger-message-slot');
        this.$el.prepend($slot);
        this.history.push({msg, $slot});
        this._enforceIdConstraint(msg);
        msg.on('update', () => {
          return this._enforceIdConstraint(msg);
        });
        while (this.options.maxMessages && this.history.length > this.options.maxMessages) {
          dmsg = this.history.shift();
          dmsg.msg.remove();
          dmsg.$slot.remove();
        }
        return $slot;
      }

      _enforceIdConstraint(msg) {
        var _msg, entry, i, len, ref2;
        if (msg.options.id == null) {
          return;
        }
        ref2 = this.history;
        for (i = 0, len = ref2.length; i < len; i++) {
          entry = ref2[i];
          _msg = entry.msg;
          if ((_msg.options.id != null) && _msg.options.id === msg.options.id && msg !== _msg) {
            if (msg.options.singleton) {
              msg.hide();
              return;
            } else {
              _msg.hide();
            }
          }
        }
      }

      newMessage(opts = {}) {
        var msg, ref2, ref3, ref4;
        opts.messenger = this;
        _Message = (ref2 = (ref3 = Messenger.themes[(ref4 = opts.theme) != null ? ref4 : this.options.theme]) != null ? ref3.Message : void 0) != null ? ref2 : RetryingMessage;
        msg = new _Message(opts);
        msg.on('show', () => {
          if (opts.scrollTo && this.$el.css('position') !== 'fixed') {
            return msg.scrollTo();
          }
        });
        msg.on('hide show render', this.updateMessageSlotClasses, this);
        return msg;
      }

      updateMessageSlotClasses() {
        var anyShown, i, last, len, rec, ref2, willBeFirst;
        willBeFirst = true;
        last = null;
        anyShown = false;
        ref2 = this.history;
        for (i = 0, len = ref2.length; i < len; i++) {
          rec = ref2[i];
          rec.$slot.removeClass('messenger-first messenger-last messenger-shown');
          if (rec.msg.shown && rec.msg.rendered) {
            rec.$slot.addClass('messenger-shown');
            anyShown = true;
            last = rec;
            if (willBeFirst) {
              willBeFirst = false;
              rec.$slot.addClass('messenger-first');
            }
          }
        }
        if (last != null) {
          last.$slot.addClass('messenger-last');
        }
        return this.$el[`${anyShown ? 'remove' : 'add'}Class`]('messenger-empty');
      }

      hideAll() {
        var i, len, rec, ref2, results;
        ref2 = this.history;
        results = [];
        for (i = 0, len = ref2.length; i < len; i++) {
          rec = ref2[i];
          results.push(rec.msg.hide());
        }
        return results;
      }

      post(opts) {
        var msg;
        if (_.isString(opts)) {
          opts = {
            message: opts
          };
        }
        opts = $.extend(true, {}, this.messageDefaults, opts);
        msg = this.newMessage(opts);
        msg.update(opts);
        return msg;
      }

    };

    _Messenger.prototype.tagName = 'ul';

    _Messenger.prototype.className = 'messenger';

    _Messenger.prototype.messageDefaults = {
      type: 'info'
    };

    return _Messenger;

  }).call(this);

  ActionMessenger = (function() {
    class ActionMessenger extends _Messenger {
      // When called, will override Backbone.sync to place globalMessenger in the chain.
      // If using Backbone >= 0.9.9, will instead override Backbone.ajax
      hookBackboneAjax(msgr_opts = {}) {
        var _ajax;
        if (window.Backbone == null) {
          throw 'Expected Backbone to be defined';
        }
        // Set backbone ajax defaults.
        msgr_opts = _.defaults(msgr_opts, {
          id: 'BACKBONE_ACTION',
          errorMessage: false,
          successMessage: "Request completed successfully.",
          showSuccessWithoutError: false
        });
        // Create ajax override
        _ajax = (options) => {
          var sync_msgr_opts;
          // if options were provided to this individual call, use them
          sync_msgr_opts = _.extend({}, msgr_opts, options.messenger);
          return this.do(sync_msgr_opts, options);
        };
        // If Backbone.ajax exists (Backbone >= 0.9.9), override it
        if (Backbone.ajax != null) {
          // We've already wrapped Backbone at some point.
          // Lets reverse that, so we don't end up making every request multiple times.
          if (Backbone.ajax._withoutMessenger) {
            Backbone.ajax = Backbone.ajax._withoutMessenger;
          }
          // We set the action to Backbone.ajax so any previous overrides in Backbone.ajax are not clobbered
          // But we are careful not to override it if a different .action was passed in.
          if ((msgr_opts.action == null) || msgr_opts.action === this.doDefaults.action) {
            msgr_opts.action = Backbone.ajax;
          }
          // Keep a reference to the previous ajax
          _ajax._withoutMessenger = Backbone.ajax;
          return Backbone.ajax = _ajax;
        } else {
          // Override Backbone.sync if Backbone < 0.9.9
          return Backbone.sync = _.wrap(Backbone.sync, function(_old_sync, ...args) {
            var _old_ajax;
            // Switch ajax methods
            _old_ajax = $.ajax;
            $.ajax = _ajax;
            // Call old Backbone.sync (with it's original context)
            _old_sync.call(this, ...args);
            // Restore ajax
            return $.ajax = _old_ajax;
          });
        }
      }

      _getHandlerResponse(returnVal) {
        if (returnVal === false) {
          return false;
        }
        if (returnVal === true || (returnVal == null)) {
          return true;
        }
        return returnVal;
      }

      _parseEvents(events = {}) {
        var desc, firstSpace, func, label, out, type;
        // We are extending the Backbone event syntax to allow a status to be included in event descriptions.
        // For example:

        // 'success click': <some func>
        // 'error click a[href=#blah]': <some func>

        out = {};
        for (label in events) {
          func = events[label];
          firstSpace = label.indexOf(' ');
          type = label.substring(0, firstSpace);
          desc = label.substring(firstSpace + 1);
          if (out[type] == null) {
            out[type] = {};
          }
          // Due to how backbone expects events, it's not possible to have multiple callbacks bound to the
          // same event.
          out[type][desc] = func;
        }
        return out;
      }

      _normalizeResponse(...resp) {
        var data, elem, i, len, type, xhr;
        type = null;
        xhr = null;
        data = null;
        for (i = 0, len = resp.length; i < len; i++) {
          elem = resp[i];
          if (elem === 'success' || elem === 'timeout' || elem === 'abort') {
            type = elem;
          } else if (((elem != null ? elem.readyState : void 0) != null) && ((elem != null ? elem.responseText : void 0) != null)) {
            xhr = elem;
          } else if (_.isObject(elem)) {
            data = elem;
          }
        }
        return [type, data, xhr];
      }

      run(m_opts, opts = {}, ...args) {
        var events, getMessageText, handler, handlers, msg, old, ref2, type;
        m_opts = $.extend(true, {}, this.messageDefaults, this.doDefaults, m_opts != null ? m_opts : {});
        events = this._parseEvents(m_opts.events);
        getMessageText = (type, xhr) => {
          var message;
          message = m_opts[type + 'Message'];
          if (_.isFunction(message)) {
            return message.call(this, type, xhr);
          }
          return message;
        };
        msg = (ref2 = m_opts.messageInstance) != null ? ref2 : this.newMessage(m_opts);
        if (m_opts.id != null) {
          msg.options.id = m_opts.id;
        }
        if (m_opts.progressMessage != null) {
          msg.update($.extend({}, m_opts, {
            message: getMessageText('progress', null),
            type: 'info'
          }));
        }
        handlers = {};
        _.each(['error', 'success'], (type) => {
          var originalHandler;
          // Intercept the error and success handlers to give handle the messaging and give the client
          // the chance to stop or replace the message.

          // - Call the existing handler
          //  - If it returns false, we don't show a message
          //  - If it returns anything other than false or a string, we show the default passed in for this type (e.g. successMessage)
          //  - If it returns a string, we show that as the message

          originalHandler = opts[type];
          return handlers[type] = (...resp) => {
            var data, defaultOpts, handlerResp, msgOpts, reason, ref3, ref4, ref5, ref6, responseOpts, xhr;
            [reason, data, xhr] = this._normalizeResponse(...resp);
            if (type === 'success' && (msg.errorCount == null) && m_opts.showSuccessWithoutError === false) {
              m_opts['successMessage'] = null;
            }
            if (type === 'error') {
              if (m_opts.errorCount == null) {
                m_opts.errorCount = 0;
              }
              m_opts.errorCount += 1;
            }
            // We allow message options to be returned by the original success/error handlers, or from the promise
            // used to call the handler.
            handlerResp = m_opts.returnsPromise ? resp[0] : typeof originalHandler === "function" ? originalHandler(...resp) : void 0;
            responseOpts = this._getHandlerResponse(handlerResp);
            if (_.isString(responseOpts)) {
              responseOpts = {
                message: responseOpts
              };
            }
            if (type === 'error' && ((xhr != null ? xhr.status : void 0) === 0 || reason === 'abort')) {
              // The request was aborted
              msg.hide();
              return;
            }
            if (type === 'error' && ((m_opts.ignoredErrorCodes != null) && (ref3 = xhr != null ? xhr.status : void 0, indexOf.call(m_opts.ignoredErrorCodes, ref3) >= 0))) {
              // We're ignoring this error
              msg.hide();
              return;
            }
            defaultOpts = {
              message: getMessageText(type, xhr),
              type: type,
              events: (ref4 = events[type]) != null ? ref4 : {},
              hideOnNavigate: type === 'success'
            };
            msgOpts = $.extend({}, m_opts, defaultOpts, responseOpts);
            if (typeof ((ref5 = msgOpts.retry) != null ? ref5.allow : void 0) === 'number') {
              msgOpts.retry.allow--;
            }
            if (type === 'error' && (xhr != null ? xhr.status : void 0) >= 500 && ((ref6 = msgOpts.retry) != null ? ref6.allow : void 0)) {
              if (msgOpts.retry.delay == null) {
                if (msgOpts.errorCount < 4) {
                  msgOpts.retry.delay = 10;
                } else {
                  msgOpts.retry.delay = 5 * 60;
                }
              }
              if (msgOpts.hideAfter) {
                if (msgOpts._hideAfter == null) {
                  msgOpts._hideAfter = msgOpts.hideAfter;
                }
                msgOpts.hideAfter = msgOpts._hideAfter + msgOpts.retry.delay;
              }
              msgOpts._retryActions = true;
              msgOpts.actions = {
                retry: {
                  label: 'retry now',
                  phrase: 'Retrying TIME',
                  auto: msgOpts.retry.auto,
                  delay: msgOpts.retry.delay,
                  action: () => {
                    msgOpts.messageInstance = msg;
                    return setTimeout(() => {
                      return this.do(msgOpts, opts, ...args);
                    }, 0);
                  }
                },
                cancel: {
                  action: () => {
                    return msg.cancel();
                  }
                }
              };
            } else if (msgOpts._retryActions) {
              delete msgOpts.actions.retry;
              delete msgOpts.actions.cancel;
              delete m_opts._retryActions;
            }
            msg.update(msgOpts);
            if (responseOpts && msgOpts.message) {
              // Force the msg box to be rerendered if the page changed:
              Messenger(_.extend({}, this.options, {
                instance: this
              }));
              return msg.show();
            } else {
              return msg.hide();
            }
          };
        });
        if (!m_opts.returnsPromise) {
          for (type in handlers) {
            handler = handlers[type];
            old = opts[type];
            opts[type] = handler;
          }
        }
        msg._actionInstance = m_opts.action(opts, ...args);
        if (m_opts.returnsPromise) {
          msg._actionInstance.then(handlers.success, handlers.error);
        }
        return msg;
      }

      ajax(m_opts, ...args) {
        m_opts.action = $.ajax;
        return this.run(m_opts, ...args);
      }

      expectPromise(action, m_opts) {
        m_opts = _.extend({}, m_opts, {
          action: action,
          returnsPromise: true
        });
        return this.run(m_opts);
      }

      error(m_opts = {}) {
        if (typeof m_opts === 'string') {
          m_opts = {
            message: m_opts
          };
        }
        m_opts.type = 'error';
        return this.post(m_opts);
      }

      info(m_opts = {}) {
        if (typeof m_opts === 'string') {
          m_opts = {
            message: m_opts
          };
        }
        m_opts.type = 'info';
        return this.post(m_opts);
      }

      success(m_opts = {}) {
        if (typeof m_opts === 'string') {
          m_opts = {
            message: m_opts
          };
        }
        m_opts.type = 'success';
        return this.post(m_opts);
      }

    };

    ActionMessenger.prototype.doDefaults = {
      progressMessage: null,
      successMessage: null,
      errorMessage: "Error connecting to the server.",
      showSuccessWithoutError: true,
      retry: {
        auto: true,
        allow: true
      },
      action: $.ajax
    };

    // Aliases
    ActionMessenger.prototype.do = ActionMessenger.prototype.run;

    return ActionMessenger;

  }).call(this);

  $.fn.messenger = function(func = {}, ...args) {
    var $el, instance, opts, ref2, ref3;
    $el = this;
    if ((func == null) || !_.isString(func)) {
      opts = func;
      if ($el.data('messenger') == null) {
        _Messenger = (ref2 = (ref3 = Messenger.themes[opts.theme]) != null ? ref3.Messenger : void 0) != null ? ref2 : ActionMessenger;
        $el.data('messenger', instance = new _Messenger($.extend({
          el: $el
        }, opts)));
        instance.render();
      }
      return $el.data('messenger');
    } else {
      return $el.data('messenger')[func](...args);
    }
  };

  // When the object is created in preboot.coffee we see that this will be called
  // when the object itself is called.
  window.Messenger._call = function(opts) {
    var $el, $parent, choosen_loc, chosen_loc, classes, defaultOpts, i, inst, len, loc, locations;
    defaultOpts = {
      extraClasses: 'messenger-fixed messenger-on-bottom messenger-on-right',
      theme: 'future',
      maxMessages: 9,
      parentLocations: ['body']
    };
    opts = $.extend(defaultOpts, $._messengerDefaults, Messenger.options, opts);
    if (opts.theme != null) {
      opts.extraClasses += ` messenger-theme-${opts.theme}`;
    }
    inst = opts.instance || Messenger.instance;
    if (opts.instance == null) {
      locations = opts.parentLocations;
      $parent = null;
      choosen_loc = null;
      for (i = 0, len = locations.length; i < len; i++) {
        loc = locations[i];
        $parent = $(loc);
        if ($parent.length) {
          chosen_loc = loc;
          break;
        }
      }
      if (!inst) {
        $el = $('<ul>');
        $parent.prepend($el);
        inst = $el.messenger(opts);
        inst._location = chosen_loc;
        Messenger.instance = inst;
      } else if (!$(inst._location).is($(chosen_loc))) {
        // A better location has since become avail on the page.
        inst.$el.detach();
        $parent.prepend(inst.$el);
      }
    }
    if (inst._addedClasses != null) {
      inst.$el.removeClass(inst._addedClasses);
    }
    inst.$el.addClass(classes = `${inst.className} ${opts.extraClasses}`);
    inst._addedClasses = classes;
    return inst;
  };

  $.extend(Messenger, {
    Message: RetryingMessage,
    Messenger: ActionMessenger,
    themes: (ref2 = Messenger.themes) != null ? ref2 : {}
  });

  $.globalMessenger = window.Messenger = Messenger;

}).call(this);
