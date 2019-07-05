odoo.define('odoo_pos_keyboard.pos', function (require) {
    "use strict"

    var screens = require('point_of_sale.screens')

    var Mode = Object.freeze({ INSERT: 1, NORMAL: 2, POPUP: 3 })

    /*--------------------------------------*\
     |         THE PRODUCT SCREEN           |
    \*======================================*/
    screens.ProductScreenWidget.include({
        show: function(reset) {
            this._super(reset);
            this.keyboard_connect()
        },
        hide: function() {
            this._super()
            this.keyboard_disconnect()
        },
        // custom functions
        keyboard_connect: function() {
            var body = $('body')
            body.keypress($.proxy(this.handle_keypress, this))
            body.keyup($.proxy(this.handle_keyup, this))
        },
        keyboard_disconnect: function() {
            var body = $('body')
            body.off("keypress", $.proxy(this.handle_keypress, this))
            body.off("keyup", $.proxy(this.handle_keyup, this))
        },
        handle_keypress: function(e) {
            var key = e.key
            var mode = get_mode(e)
            if (mode === Mode.NORMAL) {
                // 0-9 or .
                if ((key >= '0' && key <= '9') || key === '.')  {
                    this.numpad.state.appendNewChar(key)
                }
                // switch modes
                if (key === 'q' || key === '/') {                            // 'q' or '/'
                    $(".mode-button[data-mode='quantity']").click()
                }
                else if (key === 'd' || key === '-') {                       // 'd' or '-'
                    $(".mode-button[data-mode='discount']").click()
                }
                else if (key === 'p' || key === '*') {                       // 'p' or '*'
                    $(".mode-button[data-mode='price']").click()
                }
                // switch to search mode
                else if (key === 's') {                                     // 's'
                    click_searchbox()
                }
                // pay
                else if (key === 'Enter') {
                    $('.pay').click()
                }
                
                // set customer
                else if (e.key === 'c') {
                    $('.button.set-customer').click()
                }
                
//                //set product note
//                else if (e.key === 'w') {
//                    $('.button.AddNoteButton').click()
//                }
//                
//                //set order note
//                else if (e.key === 'o') {
//                    $('.button.AddNote2Button').click()
//                }
                
                
            }
        },
        // for handling non-printable characters
        handle_keyup: function(e) {
            var key = e.key
            var mode = get_mode(e)
            if (mode === Mode.NORMAL) {
                if (key === 'Backspace') {
                    document.querySelector('.numpad-backspace').click()
                }
                else if (key === 'r') {                                      // 'r'
                    var order = this.pos.get_order()
                    order.remove_orderline(order.get_selected_orderline())
                }
                else if (key === 'Delete') {
                    document.querySelector('.deleteorder-button').click()
                }
                else if (key === 'Insert' || key === 'i') {                    // 'INS' or 'i'
                    document.querySelector('.neworder-button').click()
                }
                // change orderline
                else if (key === 'ArrowDown' || key === 'j') {
                    $('.orderline.selected').next().add('.orderline:first').last().click()
                    this.scrollToSelectedOrderline()
                }
                else if (key === 'ArrowUp' || key === 'k') {
                    $('.orderline.selected').prev().add('.orderline:last').first().click()
                    this.scrollToSelectedOrderline()
                }
            }
            else if (mode === Mode.POPUP) {
                handle_popup(this, key)
            }
            else {  // if in INSERT mode
                if (key === 'Escape') {
                    blur_activeElement()
                }
            }
        },
        scrollToSelectedOrderline: function() {
            var selectedOrderline = $('.orderline.selected')
            if (selectedOrderline.length) {
                $('.order-scroller').animate({
                    scrollTop: selectedOrderline.position().top
                })
            }
        }
    })

    /*--------------------------------------*\
     |         THE PAYMENT SCREEN           |
    \*======================================*/
    var keyToPaymentIndex

    screens.PaymentScreenWidget.include({
        renderElement: function () {
            this._super()
            this.showButtonsForPaymentMethods();
            this.selectPayMethod($('.button.paymentmethod').first())
        },
        start: function () {
            this._super()
            this.showButtonsForPaymentMethods();
            this.selectPayMethod($('.button.paymentmethod').first())
        },
        show: function() {
            this._super()
            this.keyboard_connect()
        },
        hide: function(){
            this._super()
            this.keyboard_disconnect()
        },
        payment_input: function(input) {
           if (input !== "") this._super(input)
        },
        // custom functions
        keyboard_connect: function() {
            $('body').keyup($.proxy(this.handle_keyup, this))
        },
        keyboard_disconnect: function() {
            $('body').off("keyup", $.proxy(this.handle_keyup, this))
        },
        handle_keyup: function(e) {
            var mode = get_mode(e)
            if (mode === Mode.INSERT) {
                if (e.key === 'Escape') blur_activeElement()
            }
            else if (mode === Mode.NORMAL) {
                if (e.key === 'Escape') this.click_back()
                if (e.key === 'c') this.click_set_customer()

                if (keyToPaymentIndex.has(e.key))  {
                  // click on one of the payment methods
                  $('.button.paymentmethod')[keyToPaymentIndex.get(e.key)].click();
                }
                // change payment-line
                else if (e.key === 'ArrowDown') {
                    $('.paymentline.selected').next().add('.paymentline:first').last().click()
                }
                else if (e.key === 'ArrowUp') {
                    $('.paymentline.selected').prev().add('.paymentline:last').first().click()
                }
                // change payment-method
                else if (e.key === 'j') {
                    var selectedPaymentMethod = $('.button.paymentmethod.selected')
                    var nextPaymentMethod = selectedPaymentMethod.next().add('.paymentmethod:first').last()

                    this.selectPayMethod(nextPaymentMethod)
                    this.deselectPayMethod(selectedPaymentMethod)

                    this.scrollToSelectedPayMethod()
                }
                else if (e.key === 'k') {
                    var selectedPaymentMethod = $('.button.paymentmethod.selected')
                    var prevPaymentMethod = selectedPaymentMethod.prev().add('.paymentmethod:last').first()

                    this.selectPayMethod(prevPaymentMethod)
                    this.deselectPayMethod(selectedPaymentMethod)

                    this.scrollToSelectedPayMethod()
                }
                else if (e.key === 'r') {                                      // 'r'
                  $('.paymentline.selected .delete-button').click()
                }
            }
            else if (mode === Mode.POPUP) {
                handle_popup(this, e.key)
            }
        },
        showButtonsForPaymentMethods: function() {
          var paymentMethods = $('.button.paymentmethod')
          keyToPaymentIndex = new Map();
          // make sure these keys do not conflit with other bindings
     
          
          var keys = ['C', 'S', 'D', 'F', 'G', 'E', 'X', 'Z', 'H', 'V', 'B', 'N', 'M'  ]
//          var keys = { 'f1':112,
//			'f2':113,
//			'f3':114,
//			'f4':115,
//			'f5':116,
//			'f6':117,
//			'f7':118,
//			'f8':119,
//			'f9':120,
//          }
          
          for (var i = 0; i < paymentMethods.length; i++) {
        	
            // map Index to a key
            keyToPaymentIndex.set(keys[i], i);
            appendKeyToElement(keys[i], paymentMethods[i])
          
          }
        },
        selectPayMethod: function(el) {
          el.addClass("selected")
          el.css("background-color", "rgba(140,143,183,0.2)");
        },
        deselectPayMethod: function(el) {
          el.removeClass("selected")
          el.css("background-color", "");
        },
        scrollToSelectedPayMethod: function() {
            var selectedPaymentMethod = $('.paymentmethod.selected')
            var payMethodScroller = $('.left-content.pc40.touch-scrollable.scrollable-y')
            payMethodScroller.animate({
                scrollTop: selectedPaymentMethod.position().top
            })
        }
    })

    function appendKeyToElement(key, element) {
      var html = '<button style="margin: 10px; color: white; background: #6ec89a;" >' + key + '</button>'
      element.innerHTML += html
    }

    /*--------------------------------------*\
     |         THE RECEIPT SCREEN           |
    \*======================================*/
    screens.ReceiptScreenWidget.include({
        show: function(){
            this._super()
            this.keyboard_connect()
        },
        hide: function(){
            this._super()
            this.keyboard_disconnect()
        },
        // custom functions
        keyboard_connect: function() {
            $('body').keypress($.proxy(this.handle_keypress, this))
        },
        keyboard_disconnect: function() {
            $('body').off("keypress", $.proxy(this.handle_keypress, this))
        },
        handle_keypress: function(e) {
            // for receipt screen, hide is not always called
            // thus keyboard_disconnect() is not called
            // hence this condition is required to check if it's actually visible
            if (document.querySelector('.receipt-screen.screen:not(.oe_hidden)')) {
              if (e.key === 'Enter') {
            	// make delay
              //	TimeUnit.SECONDS.sleep(1);
                this.click_next()
              }
              else if (e.key === 'p') this.print()
            }
        }
    })

    /*--------------------------------------*\
     |         THE CLIENT LIST SCREEN       |
    \*======================================*/
    screens.ClientListScreenWidget.include({
        show: function(){
            this._super()
            this.body = document.querySelector('.clientlist-screen')
            this.keyboard_connect()
        },
        hide: function(){
            this._super()
            this.keyboard_disconnect()
        },
        // custom functions
        keyboard_connect: function() {
            $('body').keyup($.proxy(this.handle_keyup, this))
        },
        keyboard_disconnect: function() {
            $('body').off("keyup", $.proxy(this.handle_keyup, this))
        },
        handle_keyup: function(e) {
            var mode = get_mode(e)
            if (mode === Mode.INSERT) {
                if (e.which === $.ui.keyCode.ESCAPE) blur_activeElement()
            }
            else if (mode === Mode.NORMAL) {
                if (e.which === 83) { // 's'
                    click_searchbox(this.body)
                }
                else if (e.which === 65) { // 'a'
                    click_add_new_customer()
                    document.querySelector('input.detail.client-name').focus()
                }
                else if (e.key === 'e') {
                    var edit_button = get_edit_button();
                    if (edit_button) {
                      edit_button.click();
                      document.querySelector('input.detail.client-name').focus()
                    }
                    else {
                      this.gui.show_popup('error', {
                          'title': 'Customer Not Selected',
                          'body':  "You should first select a customer. You can close this popup by pressing 'a'. Then either press 's' to search and select a customer or press 'a' to add a new one."
                      });
                    }
                }
                else if (e.which === $.ui.keyCode.Enter) {
                    var next_button = get_next_button(this.body)
                    if (next_button && !is_hidden(next_button)) {
                    	// make delay
                    	//TimeUnit.SECONDS.sleep(1);
                        next_button.click()
                    }
                    else {
                        var save_button = get_save_button()
                        if (save_button) {
                          save_button.click()
                        }
                        else {
                          this.gui.show_popup('error', {
                              'title': 'Invalid Action',
                              'body':  "Once the customer has been selected press 'ESC' to return back to the previous screen."
                          });
                        }
                    }
                }
                else if (e.which === $.ui.keyCode.ESCAPE) {
                    click_back_button(this.body)
                }
            }
            else if (mode === Mode.POPUP) {
                if (e.key === 'Enter') {
                	// make delay
                	//TimeUnit.SECONDS.sleep(1);
                    var popup = get_popup()
                    click_cancel_button(popup)
                }
            }
        }
    })

    function click_searchbox(element) {
        if (element) {
            element.querySelector('.searchbox > input').focus()
        }
        else document.querySelector('.searchbox > input').focus()
    }

    // edit button
    function get_edit_button(element) {
        if (element) {
            return element.querySelector('.button.edit')
        }
        return document.querySelector('.button.edit')
    }

    function click_edit_button(element) {
        get_edit_button(element).click()
    }

    // next button
    function get_next_button(element) {
        if (element) {
            return element.querySelector('.button.next')
        }
        return document.querySelector('.button.next')
    }

    function click_next_button(element) {
        get_next_button(element).click()
    }

    // back button
    function click_back_button(element) {
        get_back_button(element).click()
    }

    function get_back_button(element) {
        if (element) {
            return element.querySelector('.button.back')
        }
        return document.querySelector('.button.back')
    }

    // save button
    function get_save_button(element) {
        if (element) {
            return element.querySelector('.button.save')
        }
        return document.querySelector('.button.save')
    }

    function click_save_button(element) {
        get_save_button(element).click()
    }

    // save button
    function get_cancel_button(element) {
        if (element) {
            return element.querySelector('.button.cancel')
        }
        return document.querySelector('.button.cancel')
    }

    function click_cancel_button(element) {
        get_cancel_button(element).click()
    }

    function blur_activeElement() {
        document.activeElement.blur()
    }

    function click_add_new_customer() {
        document.querySelector('.button.new-customer').click()
    }

    function in_normal_mode(e) {
        var rx = /INPUT|SELECT|TEXTAREA/i
        return (!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly) && !get_popup()
    }

    function is_hidden(element) {
        return (element.offsetParent === null)
    }


    function get_mode(e) {
        if (get_popup()) return Mode.POPUP
        else if ($(e.target).is('input')) return Mode.INSERT
        else return Mode.NORMAL

    }

    function get_popup() {
        return document.querySelector('.modal-dialog:not(.oe_hidden) .popup')
    }

    function handle_popup(context, key) {
        var popup = get_popup()
        var confirmButton = popup.querySelector('.button.confirm')
        var cancelButton = popup.querySelector('.button.cancel')

        if (key === 'Enter') {
        	// make delay
        	//TimeUnit.SECONDS.sleep(3);
        	
            if (confirmButton) {
                confirmButton.click()
            }
            else cancelButton.click()
            // else context.gui.close_popup()
        }
        else if (key === 'Escape') {
            cancelButton.click()
            // context.gui.close_popup()
        }
    }

    screens.ProductCategoriesWidget.include({
        clear_search: function() {
            this._super()
            blur_activeElement()
        }
    })
})