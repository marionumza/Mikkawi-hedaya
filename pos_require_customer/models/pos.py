# -*- coding: utf-8 -*-

from odoo import api, fields, models, tools, _

class pos_config(models.Model):
    _inherit = 'pos.config' 

    allow_require_customer = fields.Boolean('Allow Require Customer', default=True)
