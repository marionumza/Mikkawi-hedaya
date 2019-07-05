odoo.define('pos_require_customer', function(require){
    var models = require('point_of_sale.models');
    var chrome = require('point_of_sale.chrome');
    var core = require('web.core');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var gui = require('point_of_sale.gui');
    var screens = require('point_of_sale.screens');
    var PopupWidget = require("point_of_sale.popups");
    var _t = core._t;
    

    screens.PaymentScreenWidget.include({
        validate_order: function(options) {
            if(this.pos.config.allow_require_customer && !this.pos.get('selectedOrder').get_client()){
                this.gui.show_popup('error',{
                    'title': _t('Warning'),
                    'body':  _t('Please select a customer for this order.'),
                    
                });
                return;
            }
            return this._super(options);
        }
    });
    
    
    
});
