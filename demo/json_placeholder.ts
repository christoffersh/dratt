import {
  dratt,
  ExpectBody,
  ExpectProperty,
  ExpectStatus,
  LogLevel,
  Test,
  TestSuite,
} from "../dratt.ts";

const todoPostDto = {
  userId: 1,
  title: "My dto",
  complete: false,
};

const todoPutDto = {
  id: 1,
  userId: 1,
  title: "My dto",
  complete: false,
};

await dratt().run$(
  TestSuite("JSON placeholder").variables({
    baseUrl: "https://jsonplaceholder.typicode.com",
  }).tests(
    Test("Todo CRUD")
      .post(
        "${baseUrl}/todos",
        todoPostDto,
        [
          ExpectStatus.toBe(201),
          ExpectBody.toBe(
            { ...todoPostDto, id: ExpectProperty.type("number") },
          ),
        ],
      )
      .get("${baseUrl}/todos", [ExpectStatus.toBe(200)])
      .put(
        "${baseUrl}/todos/1",
        todoPutDto,
        [
          ExpectStatus.toBe(200),
          ExpectBody.toBe(todoPutDto),
          ExpectBody.toInclude({ title: "My dto" }),
        ],
      ).delete("${baseUrl}/todos/1", [ExpectStatus.toBe(200)]),
  ),
);
