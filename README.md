# TaskDesignDrawer

Tek dosya. `issue-management-ui` içinde şu yola koy:

`src/pages/requests/tasks/form/development/TaskDesignDrawer.tsx`

Uygulama zaten `@mantine/core` ve `MantineProvider` kullanıyor. Ek paket yok.

```tsx
<TaskDesignDrawer onClose={close} />
```

Bileşen kendi Drawer'ını açar. Dışarıdan ikinci bir Drawer'a sarma. Veri dosyanın içinde; API'ye gitmez.
