// Allow importing CSS files as side-effects (e.g. import "@/app/globals.css")
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
