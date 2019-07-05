# -*- coding: utf-8 -*-
# Part of BrowseInfo. See LICENSE file for full copyright and licensing details.

from openerp import fields, models, api, _, tools
import logging
_logger = logging.getLogger(__name__)


class PosConfiguration(models.Model):
	_inherit = 'pos.config'
	
	discount_type = fields.Selection([('percentage', "Percentage"), ('fixed', "Fixed")], string='Discount Type', default='percentage', help='Seller can apply different Discount Type in POS.')
	


class PosOrderInherit(models.Model):
	_inherit = 'pos.order'

	coupon_id = fields.Many2one('pos.gift.coupon')
	discount_type = fields.Char(string='Discount Type')
	# amount_tax = fields.Float(compute='_compute_amount_all', string='Taxes', digits=0,store=True)
	# amount_total = fields.Float(compute='_compute_amount_all', string='Total', digits=0,store=True)
	# amount_paid = fields.Float(compute='_compute_amount_all', string='Paid', states={'draft': [('readonly', False)]}, readonly=True, digits=0,store=True)

	@api.model
	def _amount_line_tax(self, line, fiscal_position_id):
		taxes = line.tax_ids.filtered(lambda t: t.company_id.id == line.order_id.company_id.id)
		if fiscal_position_id:
			taxes = fiscal_position_id.map_tax(taxes, line.product_id, line.order_id.partner_id)
		for order in self:
			if line.discount_line_type == 'Percentage':
				price = line.price_unit * (1 - (line.discount or 0.0) / 100.0)

			else:
				price = line.price_unit - line.discount

		taxes = taxes.compute_all(price, line.order_id.pricelist_id.currency_id, line.qty, product=line.product_id, partner=line.order_id.partner_id or False)['taxes']
		return sum(tax.get('amount', 0.0) for tax in taxes)


	@api.depends('statement_ids', 'lines.price_subtotal_incl', 'lines.discount')
	def _compute_amount_all(self):
		for order in self:
			order.amount_paid = order.amount_return = order.amount_tax = 0.0
			currency = order.pricelist_id.currency_id
			order.amount_paid = sum(payment.amount for payment in order.statement_ids)
			order.amount_return = sum(payment.amount < 0 and payment.amount or 0 for payment in order.statement_ids)
			order.amount_tax = currency.round(sum(self._amount_line_tax(line, order.fiscal_position_id) for line in order.lines))
			amount_untaxed = currency.round(sum(line.price_subtotal for line in order.lines))
			order.amount_total = order.amount_paid

	@api.model
	def create_from_ui(self, orders):
		# Keep only new orders
		submitted_references = [o['data']['name'] for o in orders]
		pos_order = self.search([('pos_reference', 'in', submitted_references)])
		existing_orders = pos_order.read(['pos_reference'])
		existing_references = set([o['pos_reference'] for o in existing_orders])
		orders_to_save = [o for o in orders if o['data']['name'] not in existing_references]
		order_ids = []

		for tmp_order in orders_to_save:
			to_invoice = tmp_order['to_invoice']
			order = tmp_order['data']
			if to_invoice:
				self._match_payment_to_invoice(order)
			pos_order = self._process_order(order)
			order_ids.append(pos_order.id)

			for order_id in order_ids:
				pos_order_id = self.browse(order_id)
				if pos_order_id:
					ref_order = [o['data'] for o in orders if o['data'].get('name') == pos_order_id.pos_reference]
					for order in ref_order:
						if pos_order_id.session_id.config_id.discount_type == 'percentage':
							pos_order_id.update({'discount_type': "Percentage"})
							pos_order_id.lines.update({'discount_line_type': "Percentage"})
						if pos_order_id.session_id.config_id.discount_type == 'fixed':
							pos_order_id.update({'discount_type': "Fixed"})
							pos_order_id.lines.update({'discount_line_type': "Fixed"})
						coupon_id = order.get('coupon_id', False)
						coup_max_amount = order.get('coup_maxamount',False)
						pos_order_id.write({'coupon_id':  coupon_id})
						pos_order_id.coupon_id.update({'coupon_count': pos_order_id.coupon_id.coupon_count + 1})
						pos_order_id.coupon_id.update({'max_amount': coup_max_amount})
			try:
				pos_order.action_pos_order_paid()
			except psycopg2.OperationalError:
				# do not hide transactional errors, the order(s) won't be saved!
				raise
			except Exception as e:
				_logger.error('Could not fully process the POS Order: %s', tools.ustr(e))

			if to_invoice:
				pos_order.action_pos_order_invoice()
				pos_order.invoice_id.sudo().action_invoice_open()
				pos_order.account_move = pos_order.invoice_id.move_id
		return order_ids

	def _action_create_invoice_line(self, line=False, invoice_id=False):
		InvoiceLine = self.env['account.invoice.line']
		inv_name = line.product_id.name_get()[0][1]
		inv_line = {
			'invoice_id': invoice_id,
			'product_id': line.product_id.id,
			'quantity': line.qty,
			'account_analytic_id': self._prepare_analytic_account(line),
			'name': inv_name,
			'pos_order_id' : self.id,
		}
		# Oldlin trick
		invoice_line = InvoiceLine.sudo().new(inv_line)
		invoice_line._onchange_product_id()
		invoice_line.invoice_line_tax_ids = invoice_line.invoice_line_tax_ids.filtered(lambda t: t.company_id.id == line.order_id.company_id.id).ids
		fiscal_position_id = line.order_id.fiscal_position_id
		if fiscal_position_id:
			invoice_line.invoice_line_tax_ids = fiscal_position_id.map_tax(invoice_line.invoice_line_tax_ids, line.product_id, line.order_id.partner_id)
		invoice_line.invoice_line_tax_ids = invoice_line.invoice_line_tax_ids.ids
		# We convert a new id object back to a dictionary to write to
		# bridge between old and new api
		inv_line = invoice_line._convert_to_write({name: invoice_line[name] for name in invoice_line._cache})
		inv_line.update(price_unit=line.price_unit, discount=line.discount)
		return InvoiceLine.sudo().create(inv_line)


class PosOrderLineInherit(models.Model):
	_inherit = 'pos.order.line'

	discount_line_type = fields.Char(string='Discount Type',readonly=True)

	@api.depends('price_unit', 'tax_ids', 'qty', 'discount', 'product_id')
	def _compute_amount_line_all(self):

		for line in self:

			fpos = line.order_id.fiscal_position_id
			tax_ids_after_fiscal_position = fpos.map_tax(line.tax_ids, line.product_id, line.order_id.partner_id) if fpos else line.tax_ids
			
			if line.discount_line_type == "Fixed":
				price = line.price_unit - line.discount

			else:
				price = line.price_unit * (1 - (line.discount or 0.0) / 100.0)
			taxes = tax_ids_after_fiscal_position.compute_all(price, line.order_id.pricelist_id.currency_id, line.qty, product=line.product_id, partner=line.order_id.partner_id)

			line.update({
			'price_subtotal_incl': taxes['total_included'],
			'price_subtotal': taxes['total_excluded'],
			})

class AccountInvoiceLineInherit(models.Model):
	_inherit = "account.invoice.line"

	pos_order_id = fields.Many2one('pos.order',string="POS order")

	def _compute_price(self):
		for i in self:
			currency = i.invoice_id and i.invoice_id.currency_id or None
			if i.pos_order_id.discount_type  == "Fixed":
				price = i.price_unit - i.discount
			else:
				price = i.price_unit * (1 - (i.discount or 0.0) / 100.0)
			taxes = False
			if i.invoice_line_tax_ids:
				taxes = i.invoice_line_tax_ids.compute_all(price, currency, i.quantity, product=i.product_id, partner=i.invoice_id.partner_id)
			i.price_subtotal = price_subtotal_signed = taxes['total_excluded'] if taxes else i.quantity * price
			if i.invoice_id.currency_id and i.invoice_id.company_id and i.invoice_id.currency_id != i.invoice_id.company_id.currency_id:
				price_subtotal_signed = i.invoice_id.currency_id.with_context(date=i.invoice_id._get_currency_rate_date()).compute(price_subtotal_signed, i.invoice_id.company_id.currency_id)
			sign = i.invoice_id.type in ['in_refund', 'out_refund'] and -1 or 1
			i.price_subtotal_signed = price_subtotal_signed * sign


# vim:expandtab:smartindent:tabstop=4:softtabstop=4:shiftwidth=4:
