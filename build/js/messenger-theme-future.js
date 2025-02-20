(function() {
  var $, FutureMessage, spinner_template;

  $ = jQuery;

  spinner_template = `<div class="messenger-spinner">
    <span class="messenger-spinner-side messenger-spinner-side-left">
        <span class="messenger-spinner-fill"></span>
    </span>
    <span class="messenger-spinner-side messenger-spinner-side-right">
        <span class="messenger-spinner-fill"></span>
    </span>
</div>`;

  FutureMessage = class FutureMessage extends window.Messenger.Message {
    template(opts) {
      var $message;
      $message = super.template(opts);
      $message.append($(spinner_template));
      return $message;
    }

  };

  window.Messenger.themes.future = {
    Message: FutureMessage
  };

}).call(this);
