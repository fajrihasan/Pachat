"use client";

import { LoadingSwap } from "@/components/ui/loading-swap";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { Controller, useForm } from "react-hook-form";
import z from "zod";
import { CreateRoomSchema } from "@/services/supabase/schemas/rooms";
import { toast } from "sonner";
import { createRoom } from "@/services/supabase/actions/rooms";

type FormSchema = z.infer<typeof CreateRoomSchema>;

export default function NewRoomPage() {
  const form = useForm<FormSchema>({
    defaultValues: {
      name: "",
      isPublic: false,
    },
    resolver: zodResolver(CreateRoomSchema),
  });

  async function handleSubmit(data: FormSchema) {
    const { error, message } = await createRoom(data);
    if (error) {
      toast.error(message);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>New Room</CardTitle>
          <CardDescription>Create a new chat room</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.error}>
                    <FieldLabel htmlFor={field.name}>Room Name</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="isPublic"
                control={form.control}
                render={({
                  field: { value, onChange, ...field },
                  fieldState,
                }) => (
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldState.error}
                  >
                    <Checkbox
                      {...field}
                      id={field.name}
                      checked={value}
                      onCheckedChange={onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldContent>
                      <FieldLabel className="font-normal" htmlFor={field.name}>
                        Public Room
                      </FieldLabel>
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </FieldContent>
                  </Field>
                )}
              />
              <Field orientation="horizontal" className="w-full">
                <Button
                  type="submit"
                  className="grow"
                  disabled={form.formState.isSubmitting}
                >
                  <LoadingSwap isLoading={form.formState.isSubmitting}>
                    Create Room
                  </LoadingSwap>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/">Cancel</Link>
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
