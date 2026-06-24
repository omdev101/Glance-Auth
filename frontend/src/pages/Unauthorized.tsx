import React from 'react';
import ErrorPage from '@/components/ErrorPage';

const Unauthorized = () => {
  return <ErrorPage type="401" />;
};

export default Unauthorized;
