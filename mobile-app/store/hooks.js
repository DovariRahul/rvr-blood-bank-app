import { useDispatch, useSelector } from 'react-redux';

/**
 * Typed Redux hooks for the LifeLink store.
 */
export const useAppDispatch = () => useDispatch();
export const useAppSelector = useSelector;
