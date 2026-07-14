import React from 'react';
import { makeStyles, Theme, Grid, List, Paper } from '@material-ui/core';
import { CatalogSearchResultListItem } from '@backstage/plugin-catalog';
import {
  SearchBar,
  SearchFilter,
  SearchResult,
  SearchPagination,
  useSearch,
} from '@backstage/plugin-search-react';
import {
  CatalogIcon,
  Content,
  DocsIcon,
  Header,
  Page,
} from '@backstage/core-components';
import { TechDocsSearchResultListItem } from '@backstage/plugin-techdocs';

const useStyles = makeStyles((theme: Theme) => ({
  bar: {
    padding: theme.spacing(1, 0),
  },
  filters: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  filter: {
    '& + &': {
      marginTop: theme.spacing(2.5),
    },
  },
}));

const SearchPageContent = () => {
  const classes = useStyles();

  return (
    <Grid container direction="row">
      <Grid item xs={12}>
        <Paper className={classes.bar}>
          <SearchBar />
        </Paper>
      </Grid>
      <Grid item xs={3}>
        <SearchFilter.Select
          className={classes.filter}
          label="Kind"
          name="kind"
          values={['Component', 'Template', 'API', 'Group', 'User', 'System', 'Domain']}
        />
        <SearchFilter.Checkbox
          className={classes.filter}
          label="Type"
          name="type"
          values={['documentation', 'service', 'website', 'library']}
        />
      </Grid>
      <Grid item xs={9}>
        <SearchPagination />
        <SearchResult>
          <CatalogSearchResultListItem icon={<CatalogIcon />} />
          <TechDocsSearchResultListItem icon={<DocsIcon />} />
        </SearchResult>
      </Grid>
    </Grid>
  );
};

export const searchPage = (
  <SearchPageContent />
);
