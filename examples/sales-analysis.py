# %% [markdown]
# # Quarterly sales
#
# This example keeps the input data and calculation small so the effect of
# synchronizing paired files is easy to inspect.

# %%
quarterly_sales = [120, 145, 160, 190]
annual_sales = sum(quarterly_sales)
annual_sales

# %% [markdown]
# Change one of the values, save the file, and review the paired notebook to
# see JotebookSync update the corresponding code cell.
