import wx
import data
import sys

from WordEditDialog import *
from libs.WordPattern import *

class WordPanel(wx.Panel):
	'''docstring for WordPanel'''
	def __init__(self, *args, **kwargs):
		'''Create the WordPanel.'''
		wx.Panel.__init__(self, *args, **kwargs)

		# #####
		# SIZER
		# #####
		sizer = wx.BoxSizer(wx.VERTICAL)
		flexGridSizer = wx.FlexGridSizer(3, 2, 16, 32)
		addremoveButtonsSizer = wx.BoxSizer(wx.HORIZONTAL)

		# ######
		# LABELS
		# ######
		idLabel = wx.StaticText(self, label='id')
		elementsLabel = wx.StaticText(self, label='elements')
		emptyLabel = wx.StaticText(self, label='')
		# ########
		# TOOLTIPS
		# ########
		tooltip = wx.ToolTip("give ID to element")
		idLabel.SetToolTip(tooltip)

		# ########
		# CONTROLS
		# ########
		# Id element
		self.idTextControl = wx.TextCtrl(self, style=wx.TE_READONLY)
		# List box containing positive and negative data
		self.dictionariesListControl = wx.ListCtrl(self, style=wx.LC_REPORT)
		self.dictionariesListControl.InsertColumn(0, 'attribute')
		self.dictionariesListControl.InsertColumn(1, 'value')
		self.dictionariesListControl.InsertColumn(2, 'negation')
		# + (add) button
		addButton = wx.Button(self, label='+')
		# - (remove) button
		self.removeButton = wx.Button(self, label='-')
		# By default, the remove button is disabled
		self.removeButton.Disable()
		# ######
		#
		# ######
		addremoveButtonsSizer.Add(addButton)
		addremoveButtonsSizer.Add(self.removeButton)
		flexGridSizer.AddMany([
			(idLabel), (self.idTextControl, 1, wx.EXPAND),
			(elementsLabel), (self.dictionariesListControl, 1, wx.EXPAND),
			(emptyLabel), (addremoveButtonsSizer, 1, wx.EXPAND)
		])

		flexGridSizer.AddGrowableRow(1, 1)
		flexGridSizer.AddGrowableCol(1, 1)

		sizer.Add(flexGridSizer, proportion=1, flag=wx.ALL|wx.EXPAND, border=15)

		# ######
		# EVENTS
		# ######
		addButton.Bind(wx.EVT_BUTTON, self.OnAdd)
		self.removeButton.Bind(wx.EVT_BUTTON, self.OnRemove)
		self.dictionariesListControl.Bind(wx.EVT_LIST_ITEM_SELECTED , self.OnSelectElement)
		self.SetSizer(sizer)

	def OnAdd(self, event):
		wordEditDialog = WordEditDialog(self)
		while True:
			result = wordEditDialog.ShowModal()
			attribute = wordEditDialog.listBox.GetString(wordEditDialog.listBox.GetSelection())
			value = wordEditDialog.textControl.GetValue()
			negation = unicode(wordEditDialog.checkBox.GetValue())

			if result == wx.ID_CANCEL:
				break
			elif result == wx.ID_OK:
				# Validations
				if not value:
					## Check if the text control is not empty
					wx.MessageBox('Value empty', 'Error', wx.OK | wx.ICON_ERROR)
				elif negation == 'False' and self.dictionariesListControl.FindItem(-1, attribute) > -1:
					## Check if the key does not already exist for the positive dictionary
					wx.MessageBox('Already exist', 'Error', wx.OK | wx.ICON_ERROR)
				else:
					index = self.dictionariesListControl.InsertStringItem(sys.maxint, attribute)
					self.dictionariesListControl.SetStringItem(index, 1, value)
					self.dictionariesListControl.SetStringItem(index, 2, negation)
					self.OnValid(event)
					break
		wordEditDialog.Destroy()

	def OnRemove(self, event):
		item = self.dictionariesListControl.GetFirstSelected()
		self.dictionariesListControl.DeleteItem(item)
		self.OnValid(event)

	def OnValid(self, event):
		selectedItem = data.treePanel.treeControl.GetSelection()
		itemData = data.treePanel.treeControl.GetItemData(selectedItem)
		obj = itemData.GetData()

		ide = int(self.idTextControl.GetValue())
		positive = {}
		negative = {}

		# Loop through the elements of the list
		for i in range(self.dictionariesListControl.GetItemCount()):
			attribute = unicode(self.dictionariesListControl.GetItem(i, 0).GetText())
			value = unicode(self.dictionariesListControl.GetItem(i, 1).GetText())
			negation = unicode(self.dictionariesListControl.GetItem(i, 2).GetText())

			if negation == 'True':
				if attribute not in negative:
					negative[attribute] = []
				negative[attribute].append(value)
			else:
				if attribute not in positive:
					positive[attribute] = []
				positive[attribute].append(value)

		# Reinitialise the object, before adding value to the object
		obj.id = ide
		obj.positive = positive
		obj.negative = negative

		# Set the object back to the tree control
		data.treePanel.treeControl.SetItemData(selectedItem, data=wx.TreeItemData(obj))

		# Update the live panel
		data.livePanel.update()

	def OnSelectElement(self, event):
		self.removeButton.Enable(True)
