// Allow TypeScript to understand *.yaml / *.yml imports (transformed by the Vite plugin)
declare module '*.yaml' {
  const data: unknown
  export default data
}

declare module '*.yml' {
  const data: unknown
  export default data
}
