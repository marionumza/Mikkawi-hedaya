# -*- coding: utf-8 -*-
from odoo import models, fields, api



class PosConfig(models.Model):
    _inherit = 'pos.config'
    
    address = fields.Char('Address')
    
#     group_discount_id = fields.Many2one(
#         comodel_name='res.groups',
#         compute='_compute_group_discount_id',
#         string='Point of Sale - Allow Discount',
#         help="This field is there to pass the id of the 'PoS - Allow Discount'"
#         " Group to the Point of Sale Frontend.")
#     
#     
#     
#     
#     @api.multi
#     def _compute_group_discount_id(self):
#         for config in self:
#             self.group_discount_id = \
#                 self.env.ref('pos_access_right.group_discount')
    

    
    


    
    
