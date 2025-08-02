export const commonChartConfig = {
  // Configuraciones comunes para todos los gráficos
  animations: {
    enabled: true,
    easing: 'easeinout',
    speed: 800
  },
  toolbar: {
    show: false
  }
};

export const commonTooltipConfig = {
  enabled: true,
  shared: false,
  intersect: true,
  custom: function({ seriesIndex, dataPointIndex, w }) {
    // Esta función será sobrescrita por cada gráfico
    return '';
  },
  style: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: '13px'
  },
  onDatasetHover: {
    highlightDataSeries: true,
  },
  x: {
    show: false,
    format: 'dd MMM',
    formatter: undefined,
  },
  y: {
    formatter: undefined,
    title: {
      formatter: (seriesName) => seriesName,
    },
  },
  marker: {
    show: true,
  },
  fixed: {
    enabled: false,
    position: 'topRight',
    offsetX: 0,
    offsetY: 0,
  },
};

export const commonChartEvents = {
  mouseMove: function(e, chartContext, config) {
    if (config.dataPointIndex !== undefined) {
      const tooltip = document.querySelector('.apexcharts-tooltip');
      if (tooltip) {
        tooltip.style.opacity = 1;
        tooltip.style.visibility = 'visible';
        tooltip.style.pointerEvents = 'auto';
      }
    }
  },
  mouseLeave: function() {
    const tooltip = document.querySelector('.apexcharts-tooltip');
    if (tooltip) {
      tooltip.style.opacity = 0;
      tooltip.style.visibility = 'hidden';
      tooltip.style.pointerEvents = 'none';
    }
  }
};