function qtip_container_setup()
{
    $('.qtip-container').each(function() {
        $(this).qtip({
            content: $(this).next('div.qtip-body'),
            show: 'click',
            events: {
                hide: function(event, api) {
                    // Reset hide event when it hides...?
                    if (api.get('hide.event') === false) {
                        api.set('hide.event', 'mouseleave');
                    }
                }
            },
            style: {
                classes: 'ui-tooltip-dark ui-tooltip-rounded ui-tooltip-shadow',
                width: '415px'
            },
            position: {
                my: 'top right',
                at: 'bottom left',
                adjust: {
                    x: -5
                }
            }
        }).bind('click', function() {
            $(this).qtip('option', 'hide.event', 'click');
        });
  });

  // dirty hacks so we can close qtip clicking on anything but the qtip and
  // sub-elements for the qtip-body, datepicker, and relationship-type
  $(document).click(function() {
      $('.qtip-container').qtip('hide');
  });
  $('.qtip-body').click(function(e) {
    e.stopPropagation();
  });
}

$(document).ready(function() {
    //    var rel_value_escaped = "{{ relationship.value|escapejs }}";
    //    var rel_type_escaped = "{{ relationship.type|escapejs }}";


    function more_relationship_types(e, widget) {
            $.ajax({
                type: "POST",
                url: get_relationship_type_dropdown,
                data: {'all': true},
                datatype: 'json',
                id: 'button-relationships-more',
                success: function(data) {
                    if (data.types) {
                        var sel = $(widget);
                        sel.empty();
                        var sorted = [];
                        $.each(data.types, function(key, value) {
                            sorted.push(key);
                        });
                        sorted.sort();
                        $.each(sorted, function(key, value) {
                            sel.append('<option value="' + value + '">' + value + '</option>');
                        });
            //                        $('button:contains("More Relationship Types")').attr('disabled', true).addClass('ui-state-disabled');
                    }
                }
            });
    }
    function forge_relationship_dialog(e) {
    var dialog = $(this);
    var form = dialog.find("form");
    var widget = dialog.dialog("activatedBy");  // dialog-persona saves the element that opened the dialog

    get_stored_item_data(get_item_data_url);

    if (!form.attr("_dialog_once")) {
        var ind_types = form.find(".relationship-types");
        if (ind_types.length) {
        $('<button>More</button>').click(function(e) {
            e.preventDefault();
            more_relationship_types(e, "select#id_forward_relationship");
            })
            .insertAfter(ind_types);
        }

        $('<button>Get Clipboard</button>').click(function(e) {
            e.preventDefault();
            get_stored_item_data(get_item_data_url);
            //          $( "#forge-relationship-form" ).dialog( "open" );
            $('input#id_dest_id').val(readCookie('crits_rel_id'));
            $('select#id_reverse_type').val(readCookie('crits_rel_type'));
        })
        .insertAfter("#id_dest_id");

        if (widget) {
        $("#form-forge-relationship #id_forward_type").val( widget.attr("data-type") ); // rel_type_escaped).attr('selected', true);
        $("#form-forge-relationship #id_forward_value").val( widget.attr("data-value") ); // rel_value_escaped);
        } else {
        log("JS ERROR: did not have activatedBy element stored");
        }

        createPickers();
    }
    form.attr("_dialog_once", true);
    }

    function forge_relationship_submit(e) {
        // This submittion is pretty standard, it could fall under add_edit_submit with
        // callbacks for the success status.
        var dialog = $(this).closest(".ui-dialog").find(".ui-dialog-content");
        var form = $(this).find("form");
        var data = form.serialize();
        $.ajax({
            type: "POST",
            url: form.attr('action'),
            data: data,
            datatype: 'json',
            success: function(data) {
                if (data.success) {
                    $("#form-forge-relationship #id_dest_id").val('');
                    $("#form-forge-relationship #id_relationship_date").val('');
                    $('#relationship_box_container').parent().html(data.message);
                    dialog.dialog("close");
                } else {
                    if (data.message) {
                        var message = form.find(".message");
                        message.show().css('display', 'table');
                        message.html(data.message);
                    }
                }
                qtip_container_setup();
            }
        });
    }

  function confirm_breakup_dialog(e) {
      var dialog = $(this);
      var form = $("#form-confirm-breakup");
      var widget = dialog.dialog("activatedBy");  // dialog-persona saves the element that opened the dialog
      var trow = widget.closest("[rtype]");

      dialog.find('.deletemsg').html("Remove " + trow.attr('rtype') + " Relationship" +
                      // Not all relationships are created equal.
                      // XXX Can't always find a string to print with this..
                      (trow.children().next().html() ?
                       " to: <br/>" +
                       trow.children().next().html() : "" ));
  }
  function confirm_breakup_submit(e) {
      var dialog = $(this);

      var form = $("#form-confirm-breakup");
      var widget = dialog.dialog("activatedBy");  // dialog-persona saves the element that opened the dialog
      var trow = widget.closest("[rtype]");

      // Alternatively, this could be pushed hidden into the form and a normal serialization/submit
      var data = {
      reverse_type: trow.attr('rtype'),
      dest_id: trow.attr('rvalue'),
      my_type: trow.attr('mtype'),
      my_value: trow.attr('mvalue'),
      forward_relationship: trow.attr('frel'),
      relationship_date: trow.attr('rdate'),
      forge_date: trow.attr('fdate'),
      };

      $.ajax({
          type: "POST",
          url: dialog.find("form").attr('action'),
          data: data,
          datatype: 'json',
          success: function(data) {
          if (data.success) {
              dialog.dialog( "close" );
              $('#relationship_box_container').parent().html(data.message);
          } else {
              dialog.find('.message').html('<font color="red">Breakup Unsuccessful! ' + data.message + '</font>');
          }
                      qtip_container_setup();
          }
      });
  }


    var localDialogs = {
      "forge-relationship": {title: "Forge Relationship",
                 open: forge_relationship_dialog,
                 new: { submit: forge_relationship_submit },
      },
      "confirm-breakup": {title: "Confirm Breakup!",
              open: confirm_breakup_dialog,
              new: { submit: confirm_breakup_submit } }
    };

    $.each(localDialogs, function(id,opt) { stdDialog(id, opt) });

    $(document).on('click','.relationships_dropdown', function(e) {
        $(this).parent().next('td').children('table').toggle();
        if ($(this).parent().next('td').children('table').is(":visible")) {
        $(this).toggleClass('ui-icon-triangle-1-s ui-icon-triangle-1-e');
        } else {
        $(this).toggleClass('ui-icon-triangle-1-e ui-icon-triangle-1-s');
        }
    });

  qtip_container_setup()

  $('#ui-datepicker-div').click(function(e) {
    e.stopPropagation();
  });
  $('#relationship_type').click(function(e) {
    e.stopPropagation();
  });

  $(document).on('click', '.relationship_type_edit', function(e) {
      e.preventDefault();
      $(this).editable(function(value, settings) {
          return function(value, settings, elem) {
              var guardian = $(elem).parent();
              var data = {
              reverse_type: guardian.attr('rtype'),
              dest_id: guardian.attr('rvalue'),
              my_type: guardian.attr('mtype'),
              my_value: guardian.attr('mvalue'),
              forward_relationship: guardian.attr('frel'),
              relationship_date: guardian.attr('rdate'),
              forge_date: guardian.attr('fdate'),
              new_relationship: value,
              };
              $.ajax({
                  type: "POST",
                  async: false,
                  url: $(elem).attr('action'),
                  data: data,
                  success: function(data) {
                  if (data.success) {
                      guardian.attr('frel', value);
                  }
                  },
                  });
              return value;
          }(value, settings, this);
          },
          {
          event:'type_edit',
          type:'select',
          data: function() {
              var dtypes = {};
              var sorted = [];
              $.ajax({
                  type: "POST",
                  async: false,
                  url: get_relationship_type_dropdown,
                  data: {'all': true},
                  success: function(data) {
                  $.each(data.types, function(key, value) {
                      sorted.push(key);
                      });
                  sorted.sort();
                  len = sorted.length
                      for (var i=0; i < len; i++) {
                      dtypes[sorted[i]] = sorted[i];
                      }
                  }
              });
              return dtypes;
          },
          style:'display:inline',
          onblur:'submit'
          });
      $(this).trigger('type_edit');
      });
  $(document).on('click', '.relationship_date_edit', function(e) {
      e.preventDefault();
      $(this).editable(function(value, settings) {
        return function(value, settings, elem) {
            var guardian = $(elem).parent();
            var data = {
                reverse_type: guardian.attr('rtype'),
                dest_id: guardian.attr('rvalue'),
                my_type: guardian.attr('mtype'),
                my_value: guardian.attr('mvalue'),
                forward_relationship: guardian.attr('frel'),
                relationship_date: guardian.attr('rdate'),
                forge_date: guardian.attr('fdate'),
                new_relationship_date: value,
            };
            $.ajax({
                type: "POST",
                async: false,
                url: $(elem).attr('action'),
                data: data,
                success: function(data) {
                    if (data.success) {
                        guardian.attr('rdate', value);
                    }
                },
          });
          return value;
        }(value, settings, this);
        },
        {
            event:'date_edit',
            type: 'datetimepicker',
            width: '225px',
            data: '',
            style:'display:inline',
            cancel:'Cancel',
            submit:'OK'
        });
        $(this).trigger('date_edit');
      });
});
