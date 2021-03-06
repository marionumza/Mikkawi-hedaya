# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

# from odoo import fields, models, api, _, tools
# import random

# 
# class PosBarcode(models.Model):
#     _inherit = 'pos.order'

#     barcode = fields.Char(string='Barcode')
#     
#     @api.model
#     def create_from_ui(self, orders):
#         order_ids = super(PosBarcode, self).create_from_ui(orders)
#         for order_id in order_ids:
#             pos_order_id = self.browse(order_id)
#             if pos_order_id:
#                 ref_order = [o['data'] for o in orders if o['data'].get('name') == pos_order_id.pos_reference]
#                 for order in ref_order:
#                     barcode = order.get('ean13')    #(random.randrange(1111111111111,9999999999999)) #barcode = (random.randrange(1111111111111,9999999999999)) #order.get('barcode', False)
#                     pos_order_id.write({'barcode': order.get('ean13') })
#         return order_ids

from odoo import api, fields, models, _
import base64
import json
import logging

_logger = logging.getLogger(__name__)

class pos_order(models.Model):
    _inherit = "pos.order"



    @api.model
    def _order_fields(self, ui_order):
        order_fields = super(pos_order, self)._order_fields(ui_order)
        
        if ui_order.get('f_barcode', False):
            order_fields.update({
                'f_barcode': ui_order['f_barcode']
            })
            
        return order_fields
