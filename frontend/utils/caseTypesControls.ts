import Config from '@/config/config';
import { logError } from '@/utils/errorHandler';

const apiServer = Config.apiServer;

async function fetchCaseTypes(jwt: string, projectId: number | string) {
  const fetchOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  try {
    const response = await fetch(`${apiServer}/casetypes?projectId=${encodeURIComponent(projectId)}`, fetchOptions);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return await response.json();
  } catch (error: unknown) {
    logError('Error fetching case types:', error);
    return [];
  }
}

async function createCaseType(jwt: string, projectId: number | string, name: string) {
  const fetchOptions = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
    body: JSON.stringify({ name }),
  };

  const response = await fetch(`${apiServer}/casetypes?projectId=${encodeURIComponent(projectId)}`, fetchOptions);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! Status: ${response.status}`);
  }
  return await response.json();
}

async function deleteCaseType(jwt: string, id: number) {
  const fetchOptions = {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  };

  const response = await fetch(`${apiServer}/casetypes/${id}`, fetchOptions);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `HTTP error! Status: ${response.status}`);
  }
  return await response.json();
}

export { fetchCaseTypes, createCaseType, deleteCaseType };
