// frontend/src/components/index.js
// Export all components for easier imports

export { default as LoadingSpinner } from './Common/LoadingSpinner';
export { default as ErrorAlert } from './Common/ErrorAlert';
export { default as SuccessAlert } from './Common/SuccessAlert';
export { default as Tooltip } from './Common/Tooltip';
export * from './Common/SkeletonLoader';

export { default as FileUploader } from './Upload/FileUploader';
export { default as UploadProgress } from './Upload/UploadProgress';

export { default as StatsCards } from './Dashboard/StatsCards';
export { default as QualityScoreCard } from './Dashboard/QualityScoreCard';
export { default as ColumnTypeTags } from './Dashboard/ColumnTypeTags';

export { default as DataTable } from './DataTable/DataTable';
export { default as Pagination } from './DataTable/Pagination';

export { default as SmartCleanButton } from './Cleaning/SmartCleanButton';

export { default as ReviewModal } from './Modals/ReviewModal';
export { default as ExportModal } from './Modals/ExportModal';

export { default as QualityGauge } from './Charts/QualityGauge';