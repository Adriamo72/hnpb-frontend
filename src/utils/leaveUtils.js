import dayjs from 'dayjs';

/**
 * Checks if an employee is on leave for a given date.
 * @param {number} employeeId - The ID of the employee.
 * @param {string|dayjs.Dayjs} date - The date to check against (can be a string or Dayjs object).
 * @param {Array<Object>} licencias - An array of license objects, each with 'empleado_id', 'fecha_inicio', 'fecha_fin'.
 * @returns {boolean} True if the employee is on leave, false otherwise.
 */
export const isEmployeeOnLeave = (employeeId, date, licencias) => {
  if (!licencias || !Array.isArray(licencias)) {
    return false;
  }

  const checkDate = dayjs(date).startOf('day'); // Normalize to start of day for accurate comparison

  return licencias.some(licencia => {
    // Ensure all necessary fields exist and are valid dates
    if (
      licencia.empleado_id === employeeId &&
      licencia.fecha_inicio &&
      licencia.fecha_fin
    ) {
      const fechaInicio = dayjs(licencia.fecha_inicio).startOf('day');
      const fechaFin = dayjs(licencia.fecha_fin).startOf('day');

      // Check if the checkDate is within or equal to the start and end dates
      return checkDate.isBetween(fechaInicio, fechaFin, null, '[]'); // '[]' makes it inclusive
    }
    return false;
  });
};